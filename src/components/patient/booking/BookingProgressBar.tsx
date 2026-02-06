import { cn } from '@/lib/utils';
import { Building2, Stethoscope, User, Calendar, FileText, CreditCard, CheckCircle } from 'lucide-react';

export type BookingStep = 'clinic' | 'specialty' | 'doctor' | 'datetime' | 'preconsultation' | 'payment' | 'confirmation';

interface BookingProgressBarProps {
  currentStep: BookingStep;
}

const steps: { key: BookingStep; label: string; icon: React.ElementType }[] = [
  { key: 'clinic', label: 'Centre', icon: Building2 },
  { key: 'specialty', label: 'Spécialité', icon: Stethoscope },
  { key: 'doctor', label: 'Médecin', icon: User },
  { key: 'datetime', label: 'Créneau', icon: Calendar },
  { key: 'preconsultation', label: 'Pré-consult.', icon: FileText },
  { key: 'payment', label: 'Paiement', icon: CreditCard },
  { key: 'confirmation', label: 'Confirmation', icon: CheckCircle },
];

export function BookingProgressBar({ currentStep }: BookingProgressBarProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="px-4 py-3 bg-white border-b border-gray-100">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">
          Étape {currentIndex + 1} sur {steps.length}
        </span>
        <span className="text-xs font-semibold text-[#1a5fb4]">
          {steps[currentIndex]?.label}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#1a5fb4] to-[#2d7dd2] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-between mt-2">
        {steps.map((step, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div
              key={step.key}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                isPast && 'bg-[#1a5fb4]',
                isCurrent && 'bg-[#1a5fb4] ring-2 ring-[#1a5fb4]/30',
                !isPast && !isCurrent && 'bg-gray-200'
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
