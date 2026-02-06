import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sun, Moon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfToday, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingStepSlotsProps {
  selectedDate: Date | undefined;
  selectedTime: string | null;
  timeSlots: TimeSlot[];
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
  onConfirm: () => void;
  isDayAvailable: (date: Date) => boolean;
  isLoading?: boolean;
}

const WEEKDAYS = ['LU', 'MA', 'ME', 'JE', 'VE', 'SA', 'DI'];

export function BookingStepSlots({
  selectedDate,
  selectedTime,
  timeSlots,
  onDateSelect,
  onTimeSelect,
  onConfirm,
  isDayAvailable,
  isLoading,
}: BookingStepSlotsProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week for the first day (0 = Sunday, convert to Monday-first)
  const firstDayOfMonth = getDay(monthStart);
  const startPadding = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const morningSlots = timeSlots.filter((slot) => {
    const hour = parseInt(slot.time.split(':')[0]);
    return hour < 12;
  });

  const afternoonSlots = timeSlots.filter((slot) => {
    const hour = parseInt(slot.time.split(':')[0]);
    return hour >= 12;
  });

  return (
    <div className="flex flex-col h-full bg-white">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Instruction */}
          <p className="text-muted-foreground text-sm">Sélectionnez une date</p>

          {/* Calendar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h3 className="font-semibold text-foreground capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </h3>
              <button
                onClick={nextMonth}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for padding */}
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="h-10" />
              ))}

              {/* Day cells */}
              {monthDays.map((day) => {
                const isPast = isBefore(day, startOfToday());
                const isAvailable = !isPast && isDayAvailable(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isDifferentMonth = !isSameMonth(day, currentMonth);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => isAvailable && onDateSelect(day)}
                    disabled={!isAvailable || isDifferentMonth}
                    className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all mx-auto',
                      isDifferentMonth && 'text-gray-300',
                      isPast && !isDifferentMonth && 'text-gray-300',
                      !isPast && !isAvailable && !isDifferentMonth && 'text-gray-400',
                      isAvailable && !isSelected && 'text-foreground hover:bg-gray-100',
                      isSelected && 'bg-[#1a5fb4] text-white'
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <>
              {/* Morning */}
              {morningSlots.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sun className="h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold text-foreground">Matin</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {morningSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && onTimeSelect(slot.time)}
                        disabled={!slot.available}
                        className={cn(
                          'px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
                          !slot.available && 'border-gray-100 text-gray-300 line-through',
                          slot.available && selectedTime !== slot.time && 'border-gray-200 text-foreground hover:border-[#1a5fb4] hover:bg-[#e8f0fd]',
                          selectedTime === slot.time && 'bg-[#e8f0fd] border-[#1a5fb4] text-[#1a5fb4]'
                        )}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Afternoon */}
              {afternoonSlots.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Moon className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold text-foreground">Après-midi</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {afternoonSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => slot.available && onTimeSelect(slot.time)}
                        disabled={!slot.available}
                        className={cn(
                          'px-4 py-2.5 rounded-xl text-sm font-medium border transition-all',
                          !slot.available && 'border-gray-100 text-gray-300 line-through',
                          slot.available && selectedTime !== slot.time && 'border-gray-200 text-foreground hover:border-[#1a5fb4] hover:bg-[#e8f0fd]',
                          selectedTime === slot.time && 'bg-[#e8f0fd] border-[#1a5fb4] text-[#1a5fb4]'
                        )}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {timeSlots.length === 0 && !isLoading && (
                <p className="text-center text-muted-foreground py-4">
                  Aucun créneau disponible ce jour
                </p>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Confirm Button */}
      <div className="p-4 border-t border-gray-100">
        <Button
          onClick={onConfirm}
          disabled={!selectedDate || !selectedTime}
          className="w-full h-14 rounded-2xl bg-[#1a5fb4] hover:bg-[#1a4b9c] text-white font-semibold text-base"
        >
          Confirmer le créneau
          <Check className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
