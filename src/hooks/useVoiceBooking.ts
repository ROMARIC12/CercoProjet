import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parse, addDays, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AvailableSlot {
  date: Date;
  time: string;
  dateStr: string;
  timeFormatted: string;
}

interface VoiceBookingState {
  step: 'idle' | 'greeting' | 'waiting_confirm' | 'listing_slots' | 'waiting_choice' | 'confirming' | 'booking' | 'done' | 'error';
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
  availableSlots: AvailableSlot[];
  selectedSlot: AvailableSlot | null;
}

export function useVoiceBooking(
  doctorId: string | null,
  patientId: string | null,
  clinicId: string | null,
  onSuccess?: (appointmentId: string) => void
) {
  const [state, setState] = useState<VoiceBookingState>({
    step: 'idle',
    isListening: false,
    isSpeaking: false,
    transcript: '',
    error: null,
    availableSlots: [],
    selectedSlot: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Text-to-Speech using ElevenLabs
  const speak = useCallback(async (text: string): Promise<void> => {
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

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Play the audio
      return new Promise((resolve, reject) => {
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
      console.error('[VoiceBooking] TTS error:', error);
      setState(prev => ({ ...prev, isSpeaking: false }));
      
      // Fallback to browser TTS
      return new Promise((resolve) => {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'fr-FR';
          utterance.rate = 0.9;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        } else {
          resolve();
        }
      });
    }
  }, []);

  // Speech-to-Text using ElevenLabs
  const startListening = useCallback(async (): Promise<string> => {
    setState(prev => ({ ...prev, isListening: true, transcript: '' }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();

      // Record for 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));

      return new Promise((resolve, reject) => {
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach(track => track.stop());

          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
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

            if (!response.ok) {
              throw new Error('STT request failed');
            }

            const data = await response.json();
            
            if (data.error) {
              throw new Error(data.error);
            }

            const transcript = data.text || '';
            setState(prev => ({ ...prev, isListening: false, transcript }));
            resolve(transcript);
          } catch (error) {
            setState(prev => ({ ...prev, isListening: false }));
            reject(error);
          }
        };

        mediaRecorder.stop();
      });
    } catch (error) {
      setState(prev => ({ ...prev, isListening: false }));
      throw error;
    }
  }, []);

  // Fetch available slots
  const fetchAvailableSlots = useCallback(async (): Promise<AvailableSlot[]> => {
    if (!doctorId) return [];

    const slots: AvailableSlot[] = [];
    const today = startOfDay(new Date());

    // Fetch doctor availability
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

      // Get existing appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled');

      const bookedTimes = new Set(appointments?.map(a => a.appointment_time.slice(0, 5)) || []);

      // Generate available times
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
  }, [doctorId]);

  // Parse user's choice from transcript
  const parseSlotChoice = useCallback((transcript: string, slots: AvailableSlot[]): AvailableSlot | null => {
    const lower = transcript.toLowerCase();

    // Check for day mentions
    const dayWords: Record<string, number> = {
      'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4, 'vendredi': 5, 'samedi': 6, 'dimanche': 0
    };

    // Check for hour mentions
    const hourMatch = lower.match(/(\d+)\s*heure/);
    const hour = hourMatch ? parseInt(hourMatch[1]) : null;

    // Find matching slot
    for (const slot of slots) {
      const slotDay = format(slot.date, 'EEEE', { locale: fr }).toLowerCase();
      const slotHour = parseInt(slot.time.split(':')[0]);

      // Check if day matches
      const dayMatches = Object.entries(dayWords).some(([word, _]) => 
        lower.includes(word) && slotDay.startsWith(word.substring(0, 3))
      );

      // Check if hour matches
      const hourMatches = hour === slotHour;

      if (dayMatches && hourMatches) {
        return slot;
      }

      // Also check for ordinal references like "premier", "deuxième"
      const ordinals = ['premier', 'première', 'deuxième', 'troisième', 'quatrième', 'cinquième'];
      const ordinalIndex = ordinals.findIndex(o => lower.includes(o));
      if (ordinalIndex !== -1 && ordinalIndex < slots.length) {
        return slots[ordinalIndex];
      }

      // Check for simple number
      const numMatch = lower.match(/\b([1-5])\b/);
      if (numMatch) {
        const idx = parseInt(numMatch[1]) - 1;
        if (idx >= 0 && idx < slots.length) {
          return slots[idx];
        }
      }
    }

    return null;
  }, []);

  // Book the appointment
  const bookAppointment = useCallback(async (slot: AvailableSlot): Promise<string | null> => {
    if (!doctorId || !patientId) return null;

    try {
      const { data: appointmentId, error } = await supabase.rpc('book_appointment_atomic', {
        p_patient_id: patientId,
        p_doctor_id: doctorId,
        p_appointment_date: slot.dateStr,
        p_appointment_time: slot.time + ':00',
        p_clinic_id: clinicId || null,
        p_is_first_visit: true,
      });

      if (error) throw error;
      return appointmentId;
    } catch (error) {
      console.error('[VoiceBooking] Booking error:', error);
      return null;
    }
  }, [doctorId, patientId, clinicId]);

  // Main voice booking flow
  const startVoiceBooking = useCallback(async () => {
    if (!doctorId || !patientId) {
      setState(prev => ({ ...prev, error: 'Médecin ou patient non sélectionné' }));
      return;
    }

    try {
      // Step 1: Greeting
      setState(prev => ({ ...prev, step: 'greeting' }));
      await speak('Bonjour. Voulez-vous prendre un rendez-vous médical ?');

      // Step 2: Wait for confirmation
      setState(prev => ({ ...prev, step: 'waiting_confirm' }));
      const confirmResponse = await startListening();
      
      const isYes = confirmResponse.toLowerCase().includes('oui') || 
                    confirmResponse.toLowerCase().includes('ouais') ||
                    confirmResponse.toLowerCase().includes('d\'accord');
      const isNo = confirmResponse.toLowerCase().includes('non');

      if (isNo) {
        await speak('D\'accord. Au revoir et bonne journée.');
        setState(prev => ({ ...prev, step: 'idle' }));
        return;
      }

      if (!isYes) {
        await speak('Je n\'ai pas compris. Veuillez répondre par oui ou non. Voulez-vous prendre un rendez-vous ?');
        const retry = await startListening();
        const retryYes = retry.toLowerCase().includes('oui');
        if (!retryYes) {
          await speak('D\'accord. Au revoir.');
          setState(prev => ({ ...prev, step: 'idle' }));
          return;
        }
      }

      // Step 3: Fetch and list available slots
      setState(prev => ({ ...prev, step: 'listing_slots' }));
      const slots = await fetchAvailableSlots();
      
      if (slots.length === 0) {
        await speak('Désolé, il n\'y a pas de créneaux disponibles pour ce médecin dans les prochains jours. Veuillez réessayer plus tard.');
        setState(prev => ({ ...prev, step: 'idle' }));
        return;
      }

      setState(prev => ({ ...prev, availableSlots: slots }));

      // Build the availability message
      const slotsText = slots.map((s, i) => `${i + 1}. ${s.timeFormatted}`).join(', ');
      await speak(`Le médecin est disponible aux dates suivantes : ${slotsText}. Quelle date vous convient ?`);

      // Step 4: Wait for user choice
      setState(prev => ({ ...prev, step: 'waiting_choice' }));
      let selectedSlot: AvailableSlot | null = null;
      let attempts = 0;

      while (!selectedSlot && attempts < 3) {
        const choiceResponse = await startListening();
        selectedSlot = parseSlotChoice(choiceResponse, slots);
        
        if (!selectedSlot) {
          attempts++;
          if (attempts < 3) {
            await speak('Je n\'ai pas compris votre choix. Veuillez répéter le jour et l\'heure souhaités, par exemple : lundi à neuf heures.');
          }
        }
      }

      if (!selectedSlot) {
        await speak('Je suis désolé, je n\'arrive pas à comprendre votre choix. Veuillez réessayer ou contacter le secrétariat.');
        setState(prev => ({ ...prev, step: 'error', error: 'Impossible de comprendre le choix' }));
        return;
      }

      setState(prev => ({ ...prev, selectedSlot }));

      // Step 5: Confirm booking
      setState(prev => ({ ...prev, step: 'confirming' }));
      await speak(`Vous avez choisi le ${selectedSlot.timeFormatted}. Confirmez-vous ce rendez-vous ?`);

      const finalConfirm = await startListening();
      const finalYes = finalConfirm.toLowerCase().includes('oui') || 
                       finalConfirm.toLowerCase().includes('confirm');

      if (!finalYes) {
        await speak('Le rendez-vous n\'a pas été confirmé. Au revoir.');
        setState(prev => ({ ...prev, step: 'idle' }));
        return;
      }

      // Step 6: Book the appointment
      setState(prev => ({ ...prev, step: 'booking' }));
      const appointmentId = await bookAppointment(selectedSlot);

      if (appointmentId) {
        await speak(`Votre rendez-vous est programmé pour le ${selectedSlot.timeFormatted}. Merci et à bientôt.`);
        setState(prev => ({ ...prev, step: 'done' }));
        
        // Notify secretary
        if (clinicId) {
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
                message: `Nouveau rendez-vous pris par commande vocale le ${selectedSlot.timeFormatted}`,
                data: { appointment_id: appointmentId, source: 'voice_booking' },
              });
            }
          }
        }

        onSuccess?.(appointmentId);
      } else {
        await speak('Désolé, une erreur s\'est produite lors de la réservation. Veuillez réessayer.');
        setState(prev => ({ ...prev, step: 'error', error: 'Échec de la réservation' }));
      }
    } catch (error) {
      console.error('[VoiceBooking] Error:', error);
      setState(prev => ({ 
        ...prev, 
        step: 'error', 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }));
      
      // Notify user of error
      await speak('Une erreur s\'est produite. Veuillez réessayer ou contacter le secrétariat.');
    }
  }, [doctorId, patientId, clinicId, speak, startListening, fetchAvailableSlots, parseSlotChoice, bookAppointment, onSuccess]);

  // Stop the current voice interaction
  const stopVoiceBooking = useCallback(() => {
    // Stop any ongoing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop browser TTS
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setState({
      step: 'idle',
      isListening: false,
      isSpeaking: false,
      transcript: '',
      error: null,
      availableSlots: [],
      selectedSlot: null,
    });
  }, []);

  return {
    ...state,
    startVoiceBooking,
    stopVoiceBooking,
  };
}
