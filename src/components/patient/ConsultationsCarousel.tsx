import { Video, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Consultation {
  id: string;
  type: 'teleconsultation' | 'cabinet';
  date: string;
  time: string;
  doctorName: string;
  doctorAvatar?: string;
}

interface ConsultationsCarouselProps {
  consultations: Consultation[];
  onViewAll: () => void;
}

function formatAppointmentDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return "Demain";
  return format(date, 'd MMMM', { locale: fr });
}

export function ConsultationsCarousel({ consultations, onViewAll }: ConsultationsCarouselProps) {
  if (consultations.length === 0) return null;

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-foreground">Mes Consultations</h2>
        <button
          onClick={onViewAll}
          className="text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Voir tout
        </button>
      </div>

      <ScrollArea className="w-full">
        <div className="flex gap-2 sm:gap-3 pb-2">
          {consultations.map((consultation) => (
            <Card
              key={consultation.id}
              className="min-w-[220px] sm:min-w-[260px] bg-card rounded-xl sm:rounded-2xl border-0 shadow-sm flex-shrink-0 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
            >
              <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                {/* Type and time */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center ${consultation.type === 'teleconsultation'
                      ? 'bg-primary/10'
                      : 'bg-emerald-50'
                    }`}>
                    {consultation.type === 'teleconsultation' ? (
                      <Video className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    ) : (
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-sm sm:text-base truncate">
                      {consultation.type === 'teleconsultation' ? 'Téléconsultation' : 'Cabinet'}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {formatAppointmentDate(consultation.date)}, {consultation.time}
                    </p>
                  </div>
                </div>

                {/* Doctor info */}
                <div className="flex items-center gap-2 pt-1">
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                    <AvatarImage src={consultation.doctorAvatar} />
                    <AvatarFallback className="bg-amber-100 text-amber-700 text-[10px] sm:text-xs font-medium">
                      {consultation.doctorName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs sm:text-sm font-medium text-foreground truncate">
                    {consultation.doctorName}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
