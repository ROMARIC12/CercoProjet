import { useState } from 'react';
import { Search, MapPin, Star, Clock, Building2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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

interface BookingStepCenterProps {
  clinics: Clinic[];
  selectedClinic: Clinic | null;
  onSelect: (clinic: Clinic) => void;
  isLoading?: boolean;
}

const filterTabs = [
  { id: 'all', label: 'Tous' },
  { id: 'hospital', label: 'Hôpital', icon: Building2 },
  { id: 'clinic', label: 'Clinique', icon: Building2 },
];

export function BookingStepCenter({
  clinics,
  selectedClinic,
  onSelect,
  isLoading,
}: BookingStepCenterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredClinics = clinics.filter((clinic) =>
    clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clinic.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'available':
        return { label: 'DISPONIBLE', color: 'bg-emerald-500 text-white' };
      case 'waiting':
        return { label: 'ATTENTE: 15MIN', color: 'bg-orange-500 text-white' };
      case 'closed':
        return { label: 'FERMÉ', color: 'bg-gray-500 text-white' };
      default:
        return { label: 'DISPONIBLE', color: 'bg-emerald-500 text-white' };
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Rechercher un centre ou hôpital"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-white rounded-xl border-gray-200"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                activeFilter === tab.id
                  ? 'bg-[#1a5fb4] text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              )}
            >
              {tab.icon && <tab.icon className="h-4 w-4" />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Centres à proximité</h2>
          <button className="text-[#1a5fb4] text-sm font-medium">
            Voir sur la carte
          </button>
        </div>
      </div>

      {/* Clinics List */}
      <ScrollArea className="flex-1 px-4 pt-3 pb-24">
        <div className="space-y-4">
          {filteredClinics.map((clinic) => {
            const statusConfig = getStatusConfig(clinic.status);
            
            return (
              <div
                key={clinic.id}
                onClick={() => onSelect(clinic)}
                className={cn(
                  'bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer transition-all hover:shadow-md',
                  selectedClinic?.id === clinic.id && 'ring-2 ring-[#1a5fb4]'
                )}
              >
                {/* Image */}
                <div className="relative h-36 bg-gradient-to-br from-gray-100 to-gray-200">
                  {clinic.imageUrl ? (
                    <img
                      src={clinic.imageUrl}
                      alt={clinic.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge className={cn('text-xs font-semibold', statusConfig.color)}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-foreground">{clinic.name}</h3>
                    {clinic.rating && (
                      <div className="flex items-center gap-1 text-[#1a5fb4]">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-semibold text-sm">{clinic.rating}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 text-muted-foreground text-sm mb-3">
                    <MapPin className="h-4 w-4" />
                    <span>{clinic.address}{clinic.city && `, ${clinic.city}`}</span>
                    {clinic.distance && (
                      <span className="ml-1">• {clinic.distance}</span>
                    )}
                  </div>

                  {/* Specialties */}
                  {clinic.specialties && clinic.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {clinic.specialties.map((spec) => (
                        <Badge
                          key={spec}
                          variant="secondary"
                          className="bg-gray-100 text-gray-700 text-xs font-medium uppercase"
                        >
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
