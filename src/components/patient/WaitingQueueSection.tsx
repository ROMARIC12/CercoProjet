import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface WaitingQueueSectionProps {
  doctorName: string;
  clinicName: string;
  estimatedWait: number;
  onViewDetails: () => void;
}

export function WaitingQueueSection({
  doctorName,
  clinicName,
  estimatedWait,
  onViewDetails
}: WaitingQueueSectionProps) {
  return (
    <Card className="bg-card rounded-2xl sm:rounded-3xl border-0 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-destructive rounded-full animate-pulse" />
              <span className="text-[10px] sm:text-xs font-bold text-destructive uppercase tracking-wider">
                EN DIRECT
              </span>
            </div>

            {/* Title */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">File d'attente</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">
                {doctorName} - {clinicName}
              </p>
            </div>

            {/* Wait time */}
            <p className="text-sm sm:text-base font-semibold text-primary">
              ~ {estimatedWait} min d'attente
            </p>

            {/* View details button */}
            <button
              onClick={onViewDetails}
              className="inline-flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-muted hover:bg-muted/80 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-foreground transition-all duration-200 hover:scale-[1.05] active:scale-[0.95]"
            >
              Voir détails
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>

          {/* Visual element - Dark card with glow effect */}
          <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl sm:rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden relative flex-shrink-0 transition-transform hover:scale-[1.02] duration-300">
            {/* Glow effect */}
            <div className="absolute w-12 sm:w-16 h-12 sm:h-16 bg-primary/60 rounded-full blur-xl animate-pulse" />
            <div className="absolute w-6 sm:w-8 h-6 sm:h-8 bg-blue-400 rounded-full blur-md" />
            <div className="relative w-3 sm:w-4 h-3 sm:h-4 bg-white/80 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
