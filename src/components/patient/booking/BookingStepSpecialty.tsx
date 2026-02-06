import { useState } from 'react';
import { Search, Heart, Baby, Bone, Stethoscope, Eye, Droplet, Brain, Plus, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface BookingStepSpecialtyProps {
  specialties: string[];
  selectedSpecialty: string;
  onSelect: (specialty: string) => void;
  isLoading?: boolean;
}

const specialtyIcons: Record<string, React.ElementType> = {
  'Cardiologie': Heart,
  'Pédiatrie': Baby,
  'Dentiste': Bone,
  'Gynécologie': Stethoscope,
  'Ophtalmologie': Eye,
  'Dermatologie': Droplet,
  'Psychologie': Brain,
  'Généraliste': Plus,
};

const specialtyColors: Record<string, string> = {
  'Cardiologie': 'bg-blue-100 text-blue-600',
  'Pédiatrie': 'bg-sky-100 text-sky-600',
  'Dentiste': 'bg-indigo-100 text-indigo-600',
  'Gynécologie': 'bg-purple-100 text-purple-600',
  'Ophtalmologie': 'bg-teal-100 text-teal-600',
  'Dermatologie': 'bg-cyan-100 text-cyan-600',
  'Psychologie': 'bg-amber-100 text-amber-600',
  'Généraliste': 'bg-emerald-100 text-emerald-600',
};

export function BookingStepSpecialty({
  specialties,
  selectedSpecialty,
  onSelect,
  isLoading,
}: BookingStepSpecialtyProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSpecialties = specialties.filter((spec) =>
    spec.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getIcon = (specialty: string) => {
    return specialtyIcons[specialty] || Stethoscope;
  };

  const getColor = (specialty: string) => {
    return specialtyColors[specialty] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-4 pb-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher une spécialité"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-white rounded-xl border-gray-200"
          />
        </div>
      </div>

      {/* Header */}
      <div className="px-4 pb-3 flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Spécialités courantes</h2>
        <button className="text-[#1a5fb4] text-sm font-medium">
          Voir tout
        </button>
      </div>

      {/* Specialties Grid */}
      <ScrollArea className="flex-1 px-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          {filteredSpecialties.map((specialty) => {
            const Icon = getIcon(specialty);
            const colorClasses = getColor(specialty);
            const isSelected = selectedSpecialty === specialty;

            return (
              <button
                key={specialty}
                onClick={() => onSelect(specialty)}
                className={cn(
                  'flex flex-col items-center justify-center p-6 rounded-2xl bg-white border-2 transition-all hover:shadow-md',
                  isSelected
                    ? 'border-[#1a5fb4] shadow-md'
                    : 'border-transparent shadow-sm'
                )}
              >
                <div className={cn(
                  'w-14 h-14 rounded-full flex items-center justify-center mb-3',
                  colorClasses.split(' ')[0]
                )}>
                  <Icon className={cn('h-7 w-7', colorClasses.split(' ')[1])} />
                </div>
                <span className="font-semibold text-foreground text-sm text-center">
                  {specialty}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
