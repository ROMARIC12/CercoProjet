import { useState } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface BookingStepPreConsultationProps {
  consultationReason: string;
  selectedSymptoms: string[];
  additionalNotes: string;
  onReasonChange: (reason: string) => void;
  onSymptomsChange: (symptoms: string[]) => void;
  onNotesChange: (notes: string) => void;
  onContinue: () => void;
  currentStep?: number;
  totalSteps?: number;
}

const SYMPTOMS = [
  'Fièvre',
  'Toux',
  'Fatigue',
  'Maux de tête',
  'Douleurs musculaires',
  'Nausées',
  'Vertiges',
  'Essoufflement',
];

export function BookingStepPreConsultation({
  consultationReason,
  selectedSymptoms,
  additionalNotes,
  onReasonChange,
  onSymptomsChange,
  onNotesChange,
  onContinue,
  currentStep = 2,
  totalSteps = 3,
}: BookingStepPreConsultationProps) {
  const toggleSymptom = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      onSymptomsChange(selectedSymptoms.filter((s) => s !== symptom));
    } else {
      onSymptomsChange([...selectedSymptoms, symptom]);
    }
  };

  const progressPercent = (currentStep / totalSteps) * 100;

  return (
    <div className="flex flex-col h-full bg-[#f5f7fa]">
      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progression</span>
          <span className="font-semibold text-[#1a5fb4]">{currentStep}/{totalSteps}</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Consultation Reason */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">
              Quel est le motif de votre consultation ?
            </h2>
            <Textarea
              placeholder="Décrivez brièvement la raison de votre visite (ex: Douleur articulaire, suivi annuel...)"
              value={consultationReason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="min-h-[120px] bg-white rounded-xl border-gray-200 text-base resize-none"
            />
          </div>

          {/* Symptoms */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">
              Avez-vous des symptômes particuliers ?
            </h2>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((symptom) => {
                const isSelected = selectedSymptoms.includes(symptom);
                return (
                  <button
                    key={symptom}
                    onClick={() => toggleSymptom(symptom)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium border transition-all',
                      isSelected
                        ? 'bg-[#1a5fb4] text-white border-[#1a5fb4]'
                        : 'bg-white text-foreground border-gray-200 hover:border-[#1a5fb4]'
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4" />}
                    {symptom}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <Label className="text-muted-foreground text-sm mb-2 block">
              Précisions supplémentaires (optionnel)
            </Label>
            <Textarea
              placeholder="Détaillez vos symptômes ici..."
              value={additionalNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="min-h-[100px] bg-white rounded-xl border-gray-200 text-base resize-none"
            />
          </div>
        </div>
      </ScrollArea>

      {/* Continue Button */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <Button
          onClick={onContinue}
          className="w-full h-14 rounded-2xl bg-[#1a5fb4] hover:bg-[#1a4b9c] text-white font-semibold text-base"
        >
          Suivant
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
