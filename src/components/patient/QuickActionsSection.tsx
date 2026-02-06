import { Calendar, Mic, Sparkles } from 'lucide-react';

interface QuickActionsSectionProps {
  onManualBooking: () => void;
  onVoiceBooking: () => void;
}

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  onClick: () => void;
  variant: 'primary' | 'secondary';
  delay?: string;
}

function ActionCard({ title, subtitle, icon: Icon, onClick, variant, delay }: ActionCardProps) {
  const isPrimary = variant === 'primary';

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden w-full p-4 sm:p-5 text-left rounded-2xl sm:rounded-3xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${isPrimary
        ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg shadow-blue-500/25'
        : 'bg-white border border-border/50 text-foreground shadow-sm hover:shadow-md hover:border-primary/20'
        } ${delay}`}
    >
      {/* Background decoration for primary card */}
      {isPrimary && (
        <>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl transition-transform group-hover:scale-150 duration-700" />
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black/10 rounded-full blur-xl" />
        </>
      )}

      {/* Hover gradient for secondary card */}
      {!isPrimary && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      <div className="relative flex items-center justify-between gap-4">
        <div>
          <div className={`p-2.5 rounded-xl mb-3 inline-flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1 ${isPrimary ? 'bg-white/20 backdrop-blur-sm' : 'bg-primary/10'
            }`}>
            <Icon className={`w-6 h-6 ${isPrimary ? 'text-white' : 'text-primary'}`} />
          </div>
          <h3 className={`font-bold text-lg leading-tight mb-1 ${isPrimary ? 'text-white' : 'text-foreground'}`}>
            {title}
          </h3>
          <p className={`text-xs sm:text-sm font-medium ${isPrimary ? 'text-blue-100' : 'text-muted-foreground'}`}>
            {subtitle}
          </p>
        </div>

        {/* Arrow/Action indicator */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 ${isPrimary ? 'bg-white/20' : 'bg-primary/10'
          }`}>
          <Sparkles className={`w-4 h-4 ${isPrimary ? 'text-white' : 'text-primary'}`} />
        </div>
      </div>
    </button>
  );
}

export function QuickActionsSection({ onManualBooking, onVoiceBooking }: QuickActionsSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2 px-1">
        <Sparkles className="w-5 h-5 text-primary" />
        Actions rapides
      </h2>

      <div className="flex flex-col gap-4">
        <ActionCard
          title="Prendre RDV"
          subtitle="Formulaire classique"
          icon={Calendar}
          onClick={onManualBooking}
          variant="primary"
          delay="animate-enter"
        />

        <ActionCard
          title="RDV Vocal"
          subtitle="Assistant intelligent"
          icon={Mic}
          onClick={onVoiceBooking}
          variant="secondary"
          delay="animate-enter [animation-delay:100ms]"
        />
      </div>
    </div>
  );
}
