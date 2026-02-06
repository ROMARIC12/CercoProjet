import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Phone, CreditCard, Loader2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface TeleconsultationPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  doctor: {
    id: string;
    specialty: string;
    photo_url?: string | null;
    teleconsultation_price_per_minute?: number | null;
    teleconsultation_price_per_hour?: number | null;
    is_teleconsultation_free?: boolean;
    profile: {
      first_name: string;
      last_name: string;
    };
  } | null;
  onStartFreeSession: (doctorId: string) => void;
}

const DURATION_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 heure' },
];

export function TeleconsultationPaymentDialog({ 
  open, 
  onClose, 
  doctor,
  onStartFreeSession 
}: TeleconsultationPaymentDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [duration, setDuration] = useState('30');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!doctor) return null;

  const pricePerMinute = doctor.teleconsultation_price_per_minute || 100;
  const totalPrice = parseInt(duration) * pricePerMinute;
  const fullName = `Dr. ${doctor.profile.first_name} ${doctor.profile.last_name}`;
  const initials = `${doctor.profile.first_name[0]}${doctor.profile.last_name[0]}`;

  const handlePayment = async () => {
    if (!phone.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez entrer votre numéro de téléphone.',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create teleconsultation session and initiate payment
      const { data, error } = await supabase.functions.invoke('teleconsultation-initialize', {
        body: {
          doctorId: doctor.id,
          duration: parseInt(duration),
          amount: totalPrice,
          customerPhone: phone,
          customerName: `${profile?.first_name} ${profile?.last_name}`,
        }
      });

      if (error) throw error;

      if (data?.paymentUrl) {
        // Redirect to MoneyFusion payment
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'initier le paiement. Réessayez.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFreeSession = () => {
    onStartFreeSession(doctor.id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            {doctor.is_teleconsultation_free ? 'Démarrer la téléconsultation' : 'Confirmer et payer'}
          </DialogTitle>
          <DialogDescription>
            {doctor.is_teleconsultation_free 
              ? 'Cette téléconsultation est gratuite.'
              : 'Confirmez les détails de votre téléconsultation.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Doctor Card */}
          <Card className="bg-muted/50">
            <CardContent className="p-3 flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={doctor.photo_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{fullName}</p>
                <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
              </div>
            </CardContent>
          </Card>

          {!doctor.is_teleconsultation_free && (
            <>
              {/* Duration Selection */}
              <div className="space-y-2">
                <Label>Durée de la consultation</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone">Numéro de paiement</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07 00 00 00 00"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Total */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total à payer</span>
                    <span className="text-2xl font-bold text-primary">
                      {totalPrice.toLocaleString()} FCFA
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pricePerMinute} FCFA × {duration} minutes
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isProcessing}
            >
              Annuler
            </Button>
            
            {doctor.is_teleconsultation_free ? (
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleFreeSession}
              >
                <Video className="h-4 w-4 mr-2" />
                Commencer
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={handlePayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Payer
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
