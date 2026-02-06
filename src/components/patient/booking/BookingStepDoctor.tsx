import { useState } from 'react';
import { Calendar, MapPin, Clock, Filter, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, addDays, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface BookingStepDoctorProps {
  specialty: string;
  doctors: Doctor[];
  selectedDoctor: Doctor | null;
  onSelect: (doctor: Doctor) => void;
  onViewSlots: (doctor: Doctor) => void;
  isLoading?: boolean;
}

export function BookingStepDoctor({
  specialty,
  doctors,
  selectedDoctor,
  onSelect,
  onViewSlots,
  isLoading,
}: BookingStepDoctorProps) {
  const getAvailabilityLabel = (nextAvailable?: Date) => {
    if (!nextAvailable) return { label: 'BIENTÔT', color: 'bg-gray-100 text-gray-600' };
    
    if (isToday(nextAvailable)) {
      return { label: 'DISPONIBLE', color: 'bg-emerald-100 text-emerald-700' };
    }
    if (isTomorrow(nextAvailable)) {
      return { label: 'DEMAIN', color: 'bg-blue-100 text-blue-700' };
    }
    return { label: 'BIENTÔT', color: 'bg-amber-100 text-amber-700' };
  };

  const formatNextAvailable = (nextAvailable?: Date) => {
    if (!nextAvailable) return '';
    
    if (isToday(nextAvailable)) {
      return `Aujourd'hui à ${format(nextAvailable, 'HH:mm')}`;
    }
    if (isTomorrow(nextAvailable)) {
      return `Demain à ${format(nextAvailable, 'HH:mm')}`;
    }
    return `${format(nextAvailable, 'EEEE', { locale: fr })} à ${format(nextAvailable, 'HH:mm')}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#f5f7fa]">
      {/* Header Info */}
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-xl font-bold text-foreground">
          Spécialité : <span className="text-[#1a5fb4]">{specialty}</span>
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Sélectionnez votre praticien pour continuer
        </p>
      </div>

      {/* Doctors List */}
      <ScrollArea className="flex-1 px-4 pb-24">
        <div className="space-y-4">
          {doctors.map((doctor) => {
            const fullName = `Dr. ${doctor.profile?.first_name || ''} ${doctor.profile?.last_name || ''}`.trim();
            const initials = `${doctor.profile?.first_name?.[0] || ''}${doctor.profile?.last_name?.[0] || ''}`;
            const availabilityConfig = getAvailabilityLabel(doctor.nextAvailable);
            const isSelected = selectedDoctor?.id === doctor.id;

            return (
              <div
                key={doctor.id}
                className={cn(
                  'bg-white rounded-2xl p-4 shadow-sm transition-all',
                  isSelected && 'ring-2 ring-[#1a5fb4]'
                )}
              >
                {/* Availability Badge & Time */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={cn('text-xs font-semibold', availabilityConfig.color)}>
                    {availabilityConfig.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatNextAvailable(doctor.nextAvailable)}
                  </span>
                </div>

                {/* Doctor Info */}
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground">{fullName}</h3>
                    <p className="text-muted-foreground text-sm">
                      {doctor.years_experience ? `${doctor.years_experience} ans d'expérience` : doctor.specialty}
                    </p>
                    {doctor.clinic && (
                      <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{doctor.clinic.name}</span>
                      </div>
                    )}
                  </div>
                  <Avatar className="h-20 w-20 border-2 border-white shadow-md">
                    <AvatarImage src={doctor.photo_url || undefined} alt={fullName} />
                    <AvatarFallback className="bg-[#e8f0fd] text-[#1a5fb4] text-xl font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => onViewSlots(doctor)}
                  variant="outline"
                  className="w-full mt-4 h-11 rounded-xl border-[#1a5fb4] text-[#1a5fb4] font-semibold hover:bg-[#e8f0fd]"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Voir les créneaux
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Filter Button */}
      <div className="px-4 pb-6 pt-2 bg-[#f5f7fa]">
        <Button
          variant="outline"
          className="w-full h-12 rounded-xl border-gray-200 text-gray-600 font-medium"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtrer par disponibilité ou centre
        </Button>
      </div>
    </div>
  );
}
