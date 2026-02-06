import { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useDoctorPricing } from '@/hooks/useDoctorPricing';
import { useDoctorAvailability } from '@/hooks/useDoctorAvailability';

// Modular booking components
import { BookingProgressBar, type BookingStep } from './booking/BookingProgressBar';
import { BookingStepCenter } from './booking/BookingStepCenter';
import { BookingStepSpecialty } from './booking/BookingStepSpecialty';
import { BookingStepDoctor } from './booking/BookingStepDoctor';
import { BookingStepSlots } from './booking/BookingStepSlots';
import { BookingStepPreConsultation } from './booking/BookingStepPreConsultation';
import { BookingStepPayment } from './booking/BookingStepPayment';
import { BookingStepConfirmation } from './booking/BookingStepConfirmation';
import { MoneyFusionPayment } from './MoneyFusionPayment';

interface FullBookingFlowProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string | null;
  rating?: number;
  distance?: string;
  status?: 'available' | 'waiting' | 'closed';
  waitTime?: number;
  specialties?: string[];
  imageUrl?: string;
}

interface Doctor {
  id: string;
  profile_id: string;
  specialty: string;
  photo_url: string | null;
  consultation_price_min: number | null;
  years_experience?: number | null;
  profile: {
    first_name: string;
    last_name: string;
  };
  clinic?: {
    name: string;
  };
  nextAvailable?: Date;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export function FullBookingFlow({ open, onClose, onSuccess }: FullBookingFlowProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Step management
  const [step, setStep] = useState<BookingStep>('clinic');
  
  // Selection state
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  
  // DateTime selection
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  
  // Use real-time pricing and availability hooks
  const { depositAmount } = useDoctorPricing(selectedDoctor?.id || null);
  const { availability, isDayAvailable: checkDayAvailable } = useDoctorAvailability(selectedDoctor?.id || null);
  
  // Pre-consultation form
  const [consultationReason, setConsultationReason] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  
  // Booking state
  const [isLoading, setIsLoading] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [pendingAppointmentId, setPendingAppointmentId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(0);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);

  // Get patient ID and info
  useEffect(() => {
    const fetchPatientInfo = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('patients')
        .select('id, profile:profiles(first_name, last_name, phone)')
        .eq('profile_id', user.id)
        .single();
      if (data) {
        setPatientId(data.id);
        const profile = data.profile as { first_name: string; last_name: string; phone: string } | null;
        if (profile) {
          setPatientName(`${profile.first_name} ${profile.last_name}`);
          setPatientPhone(profile.phone || '');
        }
      }
    };
    if (open) fetchPatientInfo();
  }, [user, open]);

  // Fetch clinics
  useEffect(() => {
    const fetchClinics = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, address, city')
        .order('name');
      
      if (!error && data) {
        // Enrich with mock data for UI
        const enrichedClinics = data.map((clinic, index) => ({
          ...clinic,
          rating: 4.2 + (Math.random() * 0.8),
          distance: `${(index * 0.5 + 0.5).toFixed(1)} km`,
          status: index % 3 === 0 ? 'available' : index % 3 === 1 ? 'waiting' : 'available',
          waitTime: index % 3 === 1 ? 15 : undefined,
        })) as Clinic[];
        setClinics(enrichedClinics);
      }
      setIsLoading(false);
    };
    
    if (open && step === 'clinic') {
      fetchClinics();
    }
  }, [open, step]);

  // Fetch specialties when clinic is selected
  useEffect(() => {
    const fetchSpecialties = async () => {
      if (!selectedClinic) return;
      
      setIsLoading(true);
      const { data: clinicDoctors } = await supabase
        .from('clinic_doctors')
        .select('doctor_id')
        .eq('clinic_id', selectedClinic.id)
        .eq('is_active', true);
      
      if (clinicDoctors && clinicDoctors.length > 0) {
        const doctorIds = clinicDoctors.map(cd => cd.doctor_id);
        const { data: doctorsData } = await supabase
          .from('doctors')
          .select('specialty')
          .in('id', doctorIds);
        
        const specs = [...new Set(doctorsData?.map(d => d.specialty).filter(Boolean) || [])];
        setSpecialties(specs.length > 0 ? specs : getDefaultSpecialties());
      } else {
        const { data: allDoctors } = await supabase
          .from('doctors')
          .select('specialty');
        
        const specs = [...new Set(allDoctors?.map(d => d.specialty).filter(Boolean) || [])];
        setSpecialties(specs.length > 0 ? specs : getDefaultSpecialties());
      }
      setIsLoading(false);
    };

    if (step === 'specialty') {
      fetchSpecialties();
    }
  }, [selectedClinic, step]);

  // Default specialties for UI
  const getDefaultSpecialties = () => [
    'Cardiologie', 'Pédiatrie', 'Dentiste', 'Gynécologie',
    'Ophtalmologie', 'Dermatologie', 'Psychologie', 'Généraliste'
  ];

  // Fetch doctors when specialty is selected
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!selectedSpecialty) return;
      
      setIsLoading(true);
      let query = supabase
        .from('doctors')
        .select(`
          id,
          profile_id,
          specialty,
          photo_url,
          consultation_price_min,
          years_experience,
          profile:profiles(first_name, last_name)
        `)
        .eq('specialty', selectedSpecialty);

      if (selectedClinic) {
        const { data: clinicDoctors } = await supabase
          .from('clinic_doctors')
          .select('doctor_id')
          .eq('clinic_id', selectedClinic.id)
          .eq('is_active', true);
        
        if (clinicDoctors && clinicDoctors.length > 0) {
          const doctorIds = clinicDoctors.map(cd => cd.doctor_id);
          query = query.in('id', doctorIds);
        }
      }

      const { data } = await query;
      
      // Enrich with mock data
      const enrichedDoctors = (data || []).map((doctor, index) => ({
        ...doctor,
        clinic: selectedClinic ? { name: selectedClinic.name } : undefined,
        nextAvailable: addDays(new Date(), index % 3),
        years_experience: doctor.years_experience || 5 + Math.floor(Math.random() * 15),
      })) as Doctor[];
      
      setDoctors(enrichedDoctors);
      setIsLoading(false);
    };

    if (step === 'doctor') {
      fetchDoctors();
    }
  }, [selectedClinic, selectedSpecialty, step]);

  // Generate time slots for selected date
  const generateTimeSlots = useCallback(async (date: Date) => {
    if (!selectedDoctor) return;
    
    setIsLoading(true);
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);
    
    if (!dayAvailability) {
      setTimeSlots([]);
      setIsLoading(false);
      return;
    }

    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('doctor_id', selectedDoctor.id)
      .eq('appointment_date', dateStr)
      .neq('status', 'cancelled');

    const bookedTimes = new Set(existingAppointments?.map(a => a.appointment_time.slice(0, 5)) || []);

    const slots: TimeSlot[] = [];
    const startHour = parseInt(dayAvailability.start_time.split(':')[0]);
    const endHour = parseInt(dayAvailability.end_time.split(':')[0]);
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push({
          time: timeStr,
          available: !bookedTimes.has(timeStr),
        });
      }
    }

    setTimeSlots(slots);
    setIsLoading(false);
  }, [selectedDoctor, availability]);

  // Real-time slot updates
  useRealtimeSubscription({
    table: 'appointments',
    filter: selectedDoctor ? 'doctor_id' : undefined,
    filterValue: selectedDoctor?.id,
    onChange: () => {
      if (selectedDate) {
        generateTimeSlots(selectedDate);
      }
    },
  });

  useEffect(() => {
    if (selectedDate && step === 'datetime') {
      generateTimeSlots(selectedDate);
      setSelectedTime(null);
    }
  }, [selectedDate, generateTimeSlots, step]);

  const isDayAvailable = (date: Date) => {
    return checkDayAvailable(date.getDay());
  };

  // Create appointment
  const handleCreateAppointment = async (): Promise<string | null> => {
    if (!selectedDate || !selectedTime || !selectedDoctor || !patientId) return null;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { data: appointmentId, error: bookingError } = await supabase
        .rpc('book_appointment_atomic', {
          p_patient_id: patientId,
          p_doctor_id: selectedDoctor.id,
          p_appointment_date: dateStr,
          p_appointment_time: selectedTime + ':00',
          p_clinic_id: selectedClinic?.id || null,
          p_is_first_visit: true,
        });

      if (bookingError) {
        if (bookingError.message?.includes('déjà réservé')) {
          toast({
            variant: 'destructive',
            title: 'Créneau non disponible',
            description: 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.',
          });
          generateTimeSlots(selectedDate);
          setStep('datetime');
          return null;
        }
        throw bookingError;
      }

      if (appointmentId) {
        await supabase.from('consultation_forms').insert({
          appointment_id: appointmentId,
          consultation_reason: consultationReason || selectedSymptoms.join(', '),
          allergies: [],
          chronic_conditions: [],
          current_treatments: '',
          identity_confirmed: identityConfirmed,
        });
      }

      return appointmentId;
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de créer le rendez-vous.',
      });
      return null;
    }
  };

  // Handle payment method selection
  const handlePay = async (method: string) => {
    setIsBooking(true);
    const appointmentId = await handleCreateAppointment();
    setIsBooking(false);
    
    if (appointmentId) {
      setPendingAppointmentId(appointmentId);
      setShowPaymentGateway(true);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = async (ref: string) => {
    if (pendingAppointmentId && selectedDoctor && selectedDate && patientId && user) {
      const { data: queueData } = await supabase.rpc('get_queue_position', { p_appointment_id: pendingAppointmentId });
      setQueuePosition(queueData || 1);

      const { data: patientData } = await supabase
        .from('patients')
        .select('profile:profiles(first_name, last_name)')
        .eq('id', patientId)
        .single();
      
      const patientFullName = patientData?.profile 
        ? `${patientData.profile.first_name} ${patientData.profile.last_name}`
        : 'Un patient';

      const doctorName = `Dr. ${selectedDoctor.profile?.first_name || ''} ${selectedDoctor.profile?.last_name || ''}`;
      const appointmentInfo = `${format(selectedDate, 'd MMMM yyyy', { locale: fr })} à ${selectedTime}`;

      // Send notifications
      await supabase.from('notifications').insert({
        user_id: selectedDoctor.profile_id,
        type: 'new_appointment',
        title: 'Nouveau RDV confirmé',
        message: `${patientFullName} a réservé un rendez-vous le ${appointmentInfo} (paiement effectué)`,
        data: {
          appointment_id: pendingAppointmentId,
          patient_id: patientId,
          action: 'confirm_required',
          payment_ref: ref,
        },
      });

      if (selectedClinic?.id) {
        const { data: secretaries } = await supabase
          .from('clinic_secretaries')
          .select('secretary_id')
          .eq('clinic_id', selectedClinic.id)
          .eq('is_active', true);

        if (secretaries && secretaries.length > 0) {
          const secretaryNotifications = secretaries.map(sec => ({
            user_id: sec.secretary_id,
            type: 'new_appointment',
            title: 'Nouveau RDV à confirmer',
            message: `${patientFullName} a pris RDV avec ${doctorName} le ${appointmentInfo} (paiement effectué)`,
            data: {
              appointment_id: pendingAppointmentId,
              clinic_id: selectedClinic.id,
              doctor_id: selectedDoctor.id,
              patient_id: patientId,
              action: 'confirm_required',
              payment_ref: ref,
            },
          }));

          await supabase.from('notifications').insert(secretaryNotifications);
        }
      }

      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'payment_success',
        title: 'Paiement confirmé',
        message: `Votre paiement de ${depositAmount.toLocaleString()} FCFA a été reçu. Votre reçu est disponible dans vos documents.`,
        data: {
          appointment_id: pendingAppointmentId,
          amount: depositAmount,
          transaction_ref: ref,
        },
      });
    }

    toast({
      title: 'Paiement réussi ! 🎉',
      description: 'Votre rendez-vous est confirmé.',
    });

    setShowPaymentGateway(false);
    setStep('confirmation');
  };

  // Reset form
  const resetForm = () => {
    setStep('clinic');
    setSelectedClinic(null);
    setSelectedSpecialty('');
    setSelectedDoctor(null);
    setSelectedDate(undefined);
    setSelectedTime(null);
    setConsultationReason('');
    setSelectedSymptoms([]);
    setIdentityConfirmed(false);
    setPendingAppointmentId(null);
    setQueuePosition(0);
    setShowPaymentGateway(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleBack = () => {
    switch (step) {
      case 'specialty':
        setStep('clinic');
        break;
      case 'doctor':
        setStep('specialty');
        break;
      case 'datetime':
        setStep('doctor');
        break;
      case 'preconsultation':
        setStep('datetime');
        break;
      case 'payment':
        if (showPaymentGateway) {
          setShowPaymentGateway(false);
        } else {
          setStep('preconsultation');
        }
        break;
      default:
        handleClose();
    }
  };

  if (!open) return null;

  const stepTitles: Record<BookingStep, string> = {
    clinic: 'Choisir un centre',
    specialty: 'Choisir une spécialité',
    doctor: 'Choisir un médecin',
    datetime: 'Choisir un créneau',
    preconsultation: 'Pré-consultation',
    payment: 'Paiement',
    confirmation: 'Confirmation',
  };

  const doctorFullName = selectedDoctor 
    ? `Dr. ${selectedDoctor.profile?.first_name || ''} ${selectedDoctor.profile?.last_name || ''}`.trim()
    : '';

  return (
    <div className="fixed inset-0 z-50 bg-[#f5f7fa] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={step === 'confirmation' ? handleClose : handleBack}
            className="-ml-2"
          >
            {step === 'clinic' || step === 'confirmation' ? (
              <X className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
          <h1 className="font-semibold text-lg text-foreground">{stepTitles[step]}</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* Progress Bar */}
      {step !== 'confirmation' && (
        <BookingProgressBar currentStep={step} />
      )}

      {/* Step Content */}
      <div className="flex-1 overflow-hidden">
        {/* Step 1: Select Clinic */}
        {step === 'clinic' && (
          <BookingStepCenter
            clinics={clinics}
            selectedClinic={selectedClinic}
            onSelect={(clinic) => {
              setSelectedClinic(clinic);
              setStep('specialty');
            }}
            isLoading={isLoading}
          />
        )}

        {/* Step 2: Select Specialty */}
        {step === 'specialty' && (
          <BookingStepSpecialty
            specialties={specialties.length > 0 ? specialties : getDefaultSpecialties()}
            selectedSpecialty={selectedSpecialty}
            onSelect={(specialty) => {
              setSelectedSpecialty(specialty);
              setStep('doctor');
            }}
            isLoading={isLoading}
          />
        )}

        {/* Step 3: Select Doctor */}
        {step === 'doctor' && (
          <BookingStepDoctor
            specialty={selectedSpecialty}
            doctors={doctors}
            selectedDoctor={selectedDoctor}
            onSelect={setSelectedDoctor}
            onViewSlots={(doctor) => {
              setSelectedDoctor(doctor);
              setStep('datetime');
            }}
            isLoading={isLoading}
          />
        )}

        {/* Step 4: Select Date & Time */}
        {step === 'datetime' && (
          <BookingStepSlots
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            timeSlots={timeSlots}
            onDateSelect={(date) => {
              setSelectedDate(date);
            }}
            onTimeSelect={setSelectedTime}
            onConfirm={() => setStep('preconsultation')}
            isLoading={isLoading}
            isDayAvailable={(date) => 
              date >= new Date() && 
              date <= addDays(new Date(), 60) &&
              isDayAvailable(date)
            }
          />
        )}

        {/* Step 5: Pre-consultation Form */}
        {step === 'preconsultation' && (
          <BookingStepPreConsultation
            selectedSymptoms={selectedSymptoms}
            consultationReason={consultationReason}
            additionalNotes={additionalNotes}
            onSymptomsChange={setSelectedSymptoms}
            onReasonChange={setConsultationReason}
            onNotesChange={setAdditionalNotes}
            onContinue={() => setStep('payment')}
            currentStep={5}
            totalSteps={7}
          />
        )}

        {/* Step 6: Payment */}
        {step === 'payment' && !showPaymentGateway && (
          <BookingStepPayment
            doctorName={doctorFullName}
            consultationAmount={depositAmount - 500}
            serviceFee={500}
            totalAmount={depositAmount}
            onPay={handlePay}
            isLoading={isBooking}
          />
        )}

        {/* Payment Gateway */}
        {step === 'payment' && showPaymentGateway && pendingAppointmentId && patientId && (
          <div className="p-4">
            <MoneyFusionPayment
              amount={depositAmount}
              appointmentId={pendingAppointmentId}
              patientId={patientId}
              customerName={patientName}
              customerPhone={patientPhone}
              onSuccess={handlePaymentSuccess}
              onError={(error) => {
                toast({
                  variant: 'destructive',
                  title: 'Erreur de paiement',
                  description: error || 'Une erreur est survenue lors du paiement.',
                });
              }}
            />
          </div>
        )}

        {/* Step 7: Confirmation */}
        {step === 'confirmation' && (
          <BookingStepConfirmation
            clinicName={selectedClinic?.name || 'Non spécifié'}
            doctorName={doctorFullName}
            appointmentDate={selectedDate ? format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr }) : ''}
            appointmentTime={selectedTime || ''}
            queuePosition={queuePosition}
            onViewAppointments={() => {
              handleClose();
              onSuccess?.();
            }}
          />
        )}
      </div>
    </div>
  );
}
