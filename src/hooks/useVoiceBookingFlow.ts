import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export type VoiceFlowStep =
  | 'idle'
  | 'greeting'
  | 'asking_type'
  | 'waiting_type'
  | 'waiting_rdv_confirm'
  | 'asking_hospital'
  | 'waiting_hospital'
  | 'finding_doctor'
  | 'listing_slots'
  | 'waiting_choice'
  | 'recap'
  | 'asking_payment_confirm'
  | 'redirecting_payment'
  | 'payment_success'
  | 'done'
  | 'error';

interface AvailableSlot {
  date: Date;
  time: string;
  dateStr: string;
  timeFormatted: string;
}

interface Clinic {
  id: string;
  name: string;
  address: string;
}

interface Doctor {
  id: string;
  specialty: string;
  consultation_price_min: number | null;
  profile: {
    first_name: string;
    last_name: string;
  };
}

interface VoiceBookingFlowState {
  step: VoiceFlowStep;
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
  consultationType: 'cabinet' | 'video';
  clinics: Clinic[];
  selectedClinic: Clinic | null;
  selectedDoctor: Doctor | null;
  availableSlots: AvailableSlot[];
  selectedSlot: AvailableSlot | null;
  consultationPrice: number;
  pendingAppointmentId: string | null;
}

export function useVoiceBookingFlow(
  patientId: string | null,
  onPaymentRequired?: (data: {
    appointmentId: string;
    doctorId: string;
    clinicId: string;
    clinicName: string;
    slot: AvailableSlot;
    amount: number;
  }) => void,
  onSuccess?: () => void
) {
  const [state, setState] = useState<VoiceBookingFlowState>({
    step: 'idle',
    isListening: false,
    isSpeaking: false,
    transcript: '',
    error: null,
    consultationType: 'cabinet',
    clinics: [],
    selectedClinic: null,
    selectedDoctor: null,
    availableSlots: [],
    selectedSlot: null,
    consultationPrice: 100, // Default price in FCFA
    pendingAppointmentId: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortedRef = useRef(false);

  // Text-to-Speech using ElevenLabs
  const speak = useCallback(async (text: string): Promise<void> => {
    if (abortedRef.current) return;
    setState(prev => ({ ...prev, isSpeaking: true }));

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) throw new Error('TTS request failed');

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      return new Promise((resolve, reject) => {
        if (abortedRef.current) {
          setState(prev => ({ ...prev, isSpeaking: false }));
          resolve();
          return;
        }

        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        audio.onended = () => {
          setState(prev => ({ ...prev, isSpeaking: false }));
          resolve();
        };

        audio.onerror = () => {
          setState(prev => ({ ...prev, isSpeaking: false }));
          reject(new Error('Audio playback failed'));
        };

        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('[VoiceBookingFlow] TTS error:', error);
      setState(prev => ({ ...prev, isSpeaking: false }));

      // Fallback to browser TTS
      return new Promise((resolve) => {
        if ('speechSynthesis' in window) {
          const speakFallback = () => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'fr-FR';
            utterance.rate = 0.9;

            // Try to select a French voice specifically
            const voices = window.speechSynthesis.getVoices();
            const frVoice = voices.find(v => v.lang.startsWith('fr'));
            if (frVoice) utterance.voice = frVoice;

            utterance.onend = () => resolve();
            utterance.onerror = (e) => {
              console.warn('[VoiceBookingFlow] Browser TTS error:', e);
              resolve();
            };
            window.speechSynthesis.speak(utterance);
          };

          if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
              window.speechSynthesis.onvoiceschanged = null;
              speakFallback();
            };
          } else {
            speakFallback();
          }
        } else {
          resolve();
        }
      });
    }
  }, []);

  // Fallback STT using browser Web Speech API
  const browserSTT = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('[VoiceBookingFlow] Web Speech API not supported');
        resolve('');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          try { recognition.stop(); } catch { }
          resolve('');
        }
      }, 7000);

      recognition.onresult = (event: any) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          const transcript = event.results[0]?.[0]?.transcript || '';
          console.log('[VoiceBookingFlow] Browser STT result:', transcript);
          resolve(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[VoiceBookingFlow] Browser STT error:', event.error);
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve('');
        }
      };

      recognition.onend = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve('');
        }
      };

      try {
        recognition.start();
      } catch {
        resolved = true;
        clearTimeout(timeout);
        resolve('');
      }
    });
  }, []);

  // Speech-to-Text with ElevenLabs + browser fallback
  const startListening = useCallback(async (): Promise<string> => {
    if (abortedRef.current) return '';
    setState(prev => ({ ...prev, isListening: true, transcript: '' }));

    try {
      // Try ElevenLabs STT first
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      await new Promise(resolve => setTimeout(resolve, 5000));

      if (abortedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        setState(prev => ({ ...prev, isListening: false }));
        return '';
      }

      return new Promise((resolve) => {
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());

          try {
            const mimeType = mediaRecorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-stt`,
              {
                method: 'POST',
                headers: {
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
                body: formData,
              }
            );

            if (!response.ok) throw new Error('STT request failed');

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const transcript = data.text || '';
            setState(prev => ({ ...prev, isListening: false, transcript }));
            resolve(transcript);
          } catch (error) {
            console.warn('[VoiceBookingFlow] ElevenLabs STT failed, using browser fallback:', error);
            // Fallback to browser Web Speech API
            try {
              const fallbackTranscript = await browserSTT();
              setState(prev => ({ ...prev, isListening: false, transcript: fallbackTranscript }));
              resolve(fallbackTranscript);
            } catch {
              setState(prev => ({ ...prev, isListening: false }));
              resolve('');
            }
          }
        };

        mediaRecorder.stop();
      });
    } catch (error) {
      console.warn('[VoiceBookingFlow] MediaRecorder failed, falling back to browser STT');
      // Fallback: use browser Web Speech API directly
      try {
        const transcript = await browserSTT();
        setState(prev => ({ ...prev, isListening: false, transcript }));
        return transcript;
      } catch {
        setState(prev => ({ ...prev, isListening: false }));
        return '';
      }
    }
  }, [browserSTT]);

  // Fetch clinics from database
  const fetchClinics = useCallback(async (): Promise<Clinic[]> => {
    const { data } = await supabase
      .from('clinics')
      .select('id, name, address')
      .eq('is_public', true)
      .order('name');
    return data || [];
  }, []);

  // Match clinic name from transcript
  const matchClinic = useCallback((transcript: string, clinics: Clinic[]): Clinic | null => {
    const normalized = transcript.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['']/g, ' ');

    for (const clinic of clinics) {
      const clinicNormalized = clinic.name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['']/g, ' ');

      // Check for partial match
      const clinicWords = clinicNormalized.split(/\s+/);
      const matchCount = clinicWords.filter(word =>
        word.length > 2 && normalized.includes(word)
      ).length;

      if (matchCount >= 1 || normalized.includes(clinicNormalized)) {
        return clinic;
      }
    }
    return null;
  }, []);

  // Find available general practitioner at clinic
  const findAvailableDoctor = useCallback(async (clinicId: string): Promise<Doctor | null> => {
    // Get doctors at this clinic who are general practitioners
    const { data: clinicDoctors } = await supabase
      .from('clinic_doctors')
      .select(`
        doctor_id,
        doctors!inner(
          id,
          specialty,
          consultation_price_min,
          profile:profiles(first_name, last_name)
        )
      `)
      .eq('clinic_id', clinicId)
      .eq('is_active', true);

    if (!clinicDoctors || clinicDoctors.length === 0) return null;

    // Find a general practitioner
    const generalPractitioners = clinicDoctors.filter(cd => {
      const specialty = (cd.doctors as any)?.specialty?.toLowerCase() || '';
      return specialty.includes('général') ||
        specialty.includes('general') ||
        specialty.includes('médecine générale') ||
        specialty.includes('generaliste');
    });

    // If no GP found, use first available doctor
    const targetDoctor = generalPractitioners.length > 0
      ? generalPractitioners[0]
      : clinicDoctors[0];

    const doctor = targetDoctor.doctors as any;
    return {
      id: doctor.id,
      specialty: doctor.specialty,
      consultation_price_min: doctor.consultation_price_min,
      profile: doctor.profile,
    };
  }, []);

  // Fetch available slots for doctor
  const fetchAvailableSlots = useCallback(async (doctorId: string): Promise<AvailableSlot[]> => {
    const slots: AvailableSlot[] = [];
    const today = startOfDay(new Date());

    const { data: availability } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('is_active', true);

    if (!availability || availability.length === 0) return [];

    // Check next 14 days
    for (let i = 1; i <= 14 && slots.length < 5; i++) {
      const date = addDays(today, i);
      const dayOfWeek = date.getDay();
      const dateStr = format(date, 'yyyy-MM-dd');

      const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);
      if (!dayAvailability) continue;

      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled');

      const bookedTimes = new Set(appointments?.map(a => a.appointment_time.slice(0, 5)) || []);

      const startHour = parseInt(dayAvailability.start_time.split(':')[0]);
      const endHour = parseInt(dayAvailability.end_time.split(':')[0]);

      for (let hour = startHour; hour < endHour && slots.length < 5; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        if (!bookedTimes.has(timeStr)) {
          slots.push({
            date,
            time: timeStr,
            dateStr,
            timeFormatted: `${format(date, 'EEEE d MMMM', { locale: fr })} à ${hour} heures`,
          });
        }
      }
    }

    return slots;
  }, []);

  // Parse slot choice from transcript
  const parseSlotChoice = useCallback((transcript: string, slots: AvailableSlot[]): AvailableSlot | null => {
    const lower = transcript.toLowerCase();

    // Check for ordinal or number references first
    const ordinals = ['premier', 'première', 'deuxième', 'troisième', 'quatrième', 'cinquième'];
    for (let i = 0; i < ordinals.length; i++) {
      if (lower.includes(ordinals[i]) && i < slots.length) {
        return slots[i];
      }
    }

    // Check for simple number
    const numMatch = lower.match(/\b([1-5])\b/);
    if (numMatch) {
      const idx = parseInt(numMatch[1]) - 1;
      if (idx >= 0 && idx < slots.length) {
        return slots[idx];
      }
    }

    // Check for day and hour match
    const dayWords: Record<string, string> = {
      'lundi': 'lundi',
      'mardi': 'mardi',
      'mercredi': 'mercredi',
      'jeudi': 'jeudi',
      'vendredi': 'vendredi',
      'samedi': 'samedi',
      'dimanche': 'dimanche',
    };

    const hourMatch = lower.match(/(\d+)\s*heure/);
    const hour = hourMatch ? parseInt(hourMatch[1]) : null;

    for (const slot of slots) {
      const slotDay = format(slot.date, 'EEEE', { locale: fr }).toLowerCase();
      const slotHour = parseInt(slot.time.split(':')[0]);

      const dayMatches = Object.keys(dayWords).some(day =>
        lower.includes(day) && slotDay === day
      );

      if (dayMatches && hour === slotHour) {
        return slot;
      }
    }

    return null;
  }, []);

  // Parse consultation type
  const parseConsultationType = useCallback((transcript: string): 'video' | 'cabinet' | null => {
    const lower = transcript.toLowerCase();

    const videoWords = ['vidéo', 'video', 'téléconsultation', 'teleconsultation', 'ligne', 'distance', 'camera'];
    const cabinetWords = ['cabinet', 'présentiel', 'presentiel', 'physique', 'hôpital', 'hopital', 'clinique', 'sur place'];

    if (videoWords.some(word => lower.includes(word))) return 'video';
    if (cabinetWords.some(word => lower.includes(word))) return 'cabinet';
    return null;
  }, []);

  // Parse yes/no response
  const parseYesNo = useCallback((transcript: string): 'yes' | 'no' | null => {
    const lower = transcript.toLowerCase();

    const yesWords = ['oui', 'ouais', 'd\'accord', 'ok', 'okay', 'yes', 'confirme', 'confirmer', 'c\'est bon', 'parfait'];
    const noWords = ['non', 'no', 'annuler', 'stop', 'arrêter', 'pas'];

    if (yesWords.some(word => lower.includes(word))) return 'yes';
    if (noWords.some(word => lower.includes(word))) return 'no';
    return null;
  }, []);

  // Book appointment
  const bookAppointment = useCallback(async (
    doctorId: string,
    clinicId: string,
    slot: AvailableSlot
  ): Promise<string | null> => {
    if (!patientId) return null;

    try {
      const { data: appointmentId, error } = await supabase.rpc('book_appointment_atomic', {
        p_patient_id: patientId,
        p_doctor_id: doctorId,
        p_appointment_date: slot.dateStr,
        p_appointment_time: slot.time + ':00',
        p_clinic_id: clinicId,
        p_is_first_visit: true,
      });

      if (error) throw error;
      return appointmentId;
    } catch (error) {
      console.error('[VoiceBookingFlow] Booking error:', error);
      return null;
    }
  }, [patientId]);

  // Create or update consultation reason to store the type
  const saveConsultationType = useCallback(async (appointmentId: string, type: 'video' | 'cabinet') => {
    try {
      const reason = type === 'video' ? 'Téléconsultation (via Voice)' : 'Consultation en présentiel (via Voice)';

      // Check if form exists
      const { data: existingForm } = await supabase
        .from('consultation_forms')
        .select('id')
        .eq('appointment_id', appointmentId)
        .single();

      if (existingForm) {
        await supabase
          .from('consultation_forms')
          .update({ consultation_reason: reason })
          .eq('appointment_id', appointmentId);
      } else {
        await supabase
          .from('consultation_forms')
          .insert({
            appointment_id: appointmentId,
            consultation_reason: reason,
          });
      }
    } catch (error) {
      console.error('[VoiceBookingFlow] Error saving consultation type:', error);
    }
  }, []);

  // Send notification to secretary
  const notifySecretary = useCallback(async (
    clinicId: string,
    appointmentId: string,
    patientName: string,
    clinicName: string,
    doctorName: string,
    slotFormatted: string
  ) => {
    const { data: secretaries } = await supabase
      .from('clinic_secretaries')
      .select('secretary_id')
      .eq('clinic_id', clinicId)
      .eq('is_active', true);

    if (secretaries && secretaries.length > 0) {
      for (const sec of secretaries) {
        await supabase.from('notifications').insert({
          user_id: sec.secretary_id,
          type: 'voice_booking',
          title: 'Nouveau RDV vocal',
          message: `${patientName} a pris un RDV par commande vocale à ${clinicName} avec ${doctorName}, le ${slotFormatted}`,
          data: {
            appointment_id: appointmentId,
            source: 'voice_booking',
            clinic_name: clinicName,
            doctor_name: doctorName,
          },
        });
      }
    }
  }, []);

  // Main voice booking flow
  const startFlow = useCallback(async () => {
    // Mobile Audio Context Unlock (iOS/Android)
    // Create a short silent buffer to unlock the audio capabilities on user interaction
    try {
      const AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
      if (AudioContext) {
        const ctx = new AudioContext();
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        await new Promise(r => setTimeout(r, 10)); // tiny delay
      }
    } catch (e) {
      console.warn('[VoiceBookingFlow] Audio unlock failed:', e);
    }

    if (!patientId) {
      setState(prev => ({ ...prev, error: 'Patient non identifié' }));
      return;
    }

    abortedRef.current = false;

    try {
      // Step 1: Greeting
      setState(prev => ({ ...prev, step: 'greeting' }));
      await speak('Bonjour. Voulez-vous prendre un rendez-vous médical ?');

      // Step 2: Wait for confirmation
      setState(prev => ({ ...prev, step: 'waiting_rdv_confirm' }));
      let confirmResponse = await startListening();
      let answer = parseYesNo(confirmResponse);

      if (answer === 'no') {
        await speak('D\'accord. Au revoir et bonne journée.');
        setState(prev => ({ ...prev, step: 'idle' }));
        return;
      }

      if (answer !== 'yes') {
        await speak('Je n\'ai pas compris. Veuillez répondre par oui ou non. Voulez-vous prendre un rendez-vous ?');
        confirmResponse = await startListening();
        answer = parseYesNo(confirmResponse);
        if (answer !== 'yes') {
          await speak('D\'accord. Au revoir.');
          setState(prev => ({ ...prev, step: 'idle' }));
          return;
        }
      }



      // Step 3: Ask for Consultation Type
      setState(prev => ({ ...prev, step: 'asking_type' }));
      await speak('Préférez-vous une téléconsultation ou un rendez-vous au cabinet ?');

      // Wait for type choice
      setState(prev => ({ ...prev, step: 'waiting_type' }));
      let typeResponse = await startListening();
      let consultationType = parseConsultationType(typeResponse);

      let typeAttempts = 0;
      while (!consultationType && typeAttempts < 2 && !abortedRef.current) {
        typeAttempts++;
        await speak('Je n\'ai pas compris. Dites "vidéo" pour une téléconsultation ou "cabinet" pour un rendez-vous physique.');
        typeResponse = await startListening();
        consultationType = parseConsultationType(typeResponse);
      }

      // Default to cabinet if still not understood, or ask again? 
      // Let's default to cabinet for safety but inform user, or try one last time.
      if (!consultationType) {
        consultationType = 'cabinet'; // Fallback
      }

      setState(prev => ({ ...prev, consultationType: consultationType! }));

      if (consultationType === 'video') {
        // Maybe skip hospital choice if we want to route to ANY available online doctor?
        // For now, let's keep the flow consistent: choose hospital -> choose doctor -> but filter for teleconsultation?
        // The prompt says "Modify VoiceBookingFlow to ask for consultation type".
        // We will continue to ask for hospital to keep it simple, but we should mention it.
        await speak('Entendu, une téléconsultation.');
      } else {
        await speak('Entendu, rendez-vous au cabinet.');
      }

      // Step 4: Ask for hospital
      setState(prev => ({ ...prev, step: 'asking_hospital' }));
      const clinics = await fetchClinics();
      setState(prev => ({ ...prev, clinics }));

      if (clinics.length === 0) {
        await speak('Désolé, aucun hôpital n\'est disponible pour le moment. Veuillez réessayer plus tard.');
        setState(prev => ({ ...prev, step: 'error', error: 'Aucun hôpital disponible' }));
        return;
      }

      await speak('Dans quel hôpital souhaitez-vous prendre rendez-vous ?');

      // Step 4: Wait for hospital choice
      setState(prev => ({ ...prev, step: 'waiting_hospital' }));
      let selectedClinic: Clinic | null = null;
      let hospitalAttempts = 0;

      while (!selectedClinic && hospitalAttempts < 3 && !abortedRef.current) {
        const hospitalResponse = await startListening();
        selectedClinic = matchClinic(hospitalResponse, clinics);

        if (!selectedClinic) {
          hospitalAttempts++;
          if (hospitalAttempts < 3) {
            const clinicNames = clinics.slice(0, 3).map(c => c.name).join(', ');
            await speak(`Je n'ai pas compris. Les hôpitaux disponibles sont : ${clinicNames}. Veuillez répéter.`);
          }
        }
      }

      if (!selectedClinic) {
        await speak('Je suis désolé, je n\'arrive pas à identifier l\'hôpital. Veuillez contacter le secrétariat.');
        setState(prev => ({ ...prev, step: 'error', error: 'Hôpital non identifié' }));
        return;
      }

      setState(prev => ({ ...prev, selectedClinic }));

      // Step 5: Find available doctor
      setState(prev => ({ ...prev, step: 'finding_doctor' }));
      const doctor = await findAvailableDoctor(selectedClinic.id);

      if (!doctor) {
        await speak(`Aucun médecin généraliste n'est disponible à ${selectedClinic.name}. Veuillez choisir un autre hôpital ou réessayer plus tard.`);
        setState(prev => ({ ...prev, step: 'error', error: 'Aucun médecin disponible' }));
        return;
      }

      setState(prev => ({
        ...prev,
        selectedDoctor: doctor,
        consultationPrice: doctor.consultation_price_min || 100,
      }));

      // Step 6: Fetch and list slots
      setState(prev => ({ ...prev, step: 'listing_slots' }));
      const slots = await fetchAvailableSlots(doctor.id);

      if (slots.length === 0) {
        await speak(`Le médecin généraliste de ${selectedClinic.name} n'a pas de créneaux disponibles. Veuillez réessayer plus tard.`);
        setState(prev => ({ ...prev, step: 'error', error: 'Aucun créneau disponible' }));
        return;
      }

      setState(prev => ({ ...prev, availableSlots: slots }));

      const slotsText = slots.map((s, i) => `${i + 1}. ${s.timeFormatted}`).join(', ');
      await speak(`Le médecin est disponible aux dates suivantes : ${slotsText}. Quelle date vous convient ?`);

      // Step 7: Wait for slot choice
      setState(prev => ({ ...prev, step: 'waiting_choice' }));
      let selectedSlot: AvailableSlot | null = null;
      let slotAttempts = 0;

      while (!selectedSlot && slotAttempts < 3 && !abortedRef.current) {
        const slotResponse = await startListening();
        selectedSlot = parseSlotChoice(slotResponse, slots);

        if (!selectedSlot) {
          slotAttempts++;
          if (slotAttempts < 3) {
            await speak('Je n\'ai pas compris votre choix. Vous pouvez dire le numéro, par exemple : le premier, ou le jour et l\'heure, par exemple : lundi à neuf heures.');
          }
        }
      }

      if (!selectedSlot) {
        await speak('Je suis désolé, je n\'arrive pas à comprendre votre choix. Veuillez réessayer ou contacter le secrétariat.');
        setState(prev => ({ ...prev, step: 'error', error: 'Choix non compris' }));
        return;
      }

      setState(prev => ({ ...prev, selectedSlot }));

      // Step 8: Recap
      setState(prev => ({ ...prev, step: 'recap' }));
      const typeLabel = state.consultationType === 'video' ? 'en téléconsultation' : 'au cabinet';
      await speak(`Vous souhaitez prendre un rendez-vous ${typeLabel} à l'hôpital ${selectedClinic.name}, avec un médecin généraliste, le ${selectedSlot.timeFormatted}.`);

      // Step 9: Ask for payment confirmation
      setState(prev => ({ ...prev, step: 'asking_payment_confirm' }));
      const price = doctor.consultation_price_min || 100;
      await speak(`Pour confirmer cette consultation, vous devez payer la somme de ${price} francs. Voulez-vous continuer ?`);

      const paymentConfirm = await startListening();
      const paymentAnswer = parseYesNo(paymentConfirm);

      if (paymentAnswer !== 'yes') {
        await speak('Le rendez-vous a été annulé. Au revoir.');
        setState(prev => ({ ...prev, step: 'idle' }));
        return;
      }

      // Step 10: Create appointment and redirect to payment
      setState(prev => ({ ...prev, step: 'redirecting_payment' }));

      const appointmentId = await bookAppointment(doctor.id, selectedClinic.id, selectedSlot);

      if (!appointmentId) {
        await speak('Désolé, une erreur s\'est produite lors de la création du rendez-vous. Veuillez réessayer.');
        setState(prev => ({ ...prev, step: 'error', error: 'Échec de la création du RDV' }));
        return;
      }

      setState(prev => ({ ...prev, pendingAppointmentId: appointmentId }));

      // Save the type in consultation form/reason
      await saveConsultationType(appointmentId, state.consultationType);

      await speak('Vous allez maintenant être redirigé vers l\'écran de paiement. Veuillez suivre les instructions à l\'écran.');

      // Trigger payment UI
      onPaymentRequired?.({
        appointmentId,
        doctorId: doctor.id,
        clinicId: selectedClinic.id,
        clinicName: selectedClinic.name,
        slot: selectedSlot,
        amount: price,
      });

    } catch (error) {
      console.error('[VoiceBookingFlow] Error:', error);
      setState(prev => ({
        ...prev,
        step: 'error',
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }));

      await speak('Une erreur s\'est produite. Veuillez réessayer ou contacter le secrétariat.');
    }
  }, [
    patientId,
    speak,
    startListening,
    parseYesNo,
    fetchClinics,
    matchClinic,
    findAvailableDoctor,
    fetchAvailableSlots,
    parseSlotChoice,
    parseSlotChoice,
    parseConsultationType,
    bookAppointment,
    saveConsultationType,
    onPaymentRequired,
  ]);

  // Handle payment success
  const handlePaymentSuccess = useCallback(async () => {
    const { selectedClinic, selectedSlot, selectedDoctor, pendingAppointmentId } = state;

    if (!selectedClinic || !selectedSlot || !pendingAppointmentId) return;

    setState(prev => ({ ...prev, step: 'payment_success' }));

    await speak(`Votre paiement a été effectué avec succès. Votre rendez-vous est maintenant confirmé à l'hôpital ${selectedClinic.name}, le ${selectedSlot.timeFormatted}. Merci.`);

    // Update appointment status to confirmed
    await supabase
      .from('appointments')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', pendingAppointmentId);

    // Notify secretary
    if (selectedDoctor) {
      const doctorName = `Dr. ${selectedDoctor.profile.first_name} ${selectedDoctor.profile.last_name}`;
      await notifySecretary(
        selectedClinic.id,
        pendingAppointmentId,
        'Patient',
        selectedClinic.name,
        doctorName,
        selectedSlot.timeFormatted
      );
    }

    setState(prev => ({ ...prev, step: 'done' }));
    onSuccess?.();
  }, [state, speak, notifySecretary, onSuccess]);

  // Stop the flow
  const stopFlow = useCallback(() => {
    abortedRef.current = true;

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setState({
      step: 'idle',
      isListening: false,
      isSpeaking: false,
      transcript: '',
      error: null,
      consultationType: 'cabinet',
      clinics: [],
      selectedClinic: null,
      selectedDoctor: null,
      availableSlots: [],
      selectedSlot: null,
      consultationPrice: 100,
      pendingAppointmentId: null,
    });
  }, []);

  const setError = useCallback((msg: string) => {
    setState(prev => ({ ...prev, step: 'error', error: msg }));
  }, []);

  return {
    ...state,
    startFlow,
    stopFlow,
    handlePaymentSuccess,
    setError,
  };
}
