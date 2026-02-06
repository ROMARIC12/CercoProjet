import { useState, useRef } from 'react';
import { Loader2, CreditCard, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MoneyFusionPaymentProps {
  amount: number;
  appointmentId: string;
  patientId: string;
  customerName: string;
  customerPhone: string;
  onSuccess?: (transactionRef: string) => void;
  onError?: (error: string) => void;
}

export function MoneyFusionPayment({
  amount,
  appointmentId,
  patientId,
  customerName,
  customerPhone,
  onSuccess,
  onError,
}: MoneyFusionPaymentProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState(customerPhone || '');
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<{
    paymentUrl: string;
    totalPrice: number;
    article: string;
    numeroSend: string;
    nomclient: string;
    personal_Info: string;
    return_url: string;
    webhook_url: string;
  } | null>(null);

  const handlePayment = async () => {
    if (!phone) {
      toast({
        variant: 'destructive',
        title: 'Numéro requis',
        description: 'Veuillez entrer votre numéro de téléphone.',
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('[MoneyFusion] Initiating payment...', {
        amount,
        appointmentId,
        patientId,
        customerName,
        phone,
      });

      // Call edge function to initialize payment
      const { data, error } = await supabase.functions.invoke('moneyfusion-initialize', {
        body: {
          amount,
          appointmentId,
          patientId,
          customerName,
          customerPhone: phone,
        },
      });

      if (error) {
        console.error('[MoneyFusion] Edge function error:', error);
        throw new Error(error.message || 'Erreur lors de l\'initialisation du paiement');
      }

      if (!data?.success) {
        console.error('[MoneyFusion] Payment initialization failed:', data);
        throw new Error(data?.error || 'Erreur lors de l\'initialisation du paiement');
      }

      console.log('[MoneyFusion] Payment initialized:', data);

      // Store payment info for callback page
      sessionStorage.setItem('pendingPayment', JSON.stringify({
        paymentId: data.paymentId,
        appointmentId,
        amount,
        customerName,
      }));

      // Set form data and submit
      setFormData({
        paymentUrl: data.paymentUrl,
        ...data.formData,
      });

      // Submit the form after state update
      setTimeout(() => {
        if (formRef.current) {
          formRef.current.submit();
        }
      }, 100);

    } catch (error: any) {
      console.error('[MoneyFusion] Payment error:', error);
      setIsLoading(false);
      
      toast({
        variant: 'destructive',
        title: 'Erreur de paiement',
        description: error.message || 'Une erreur est survenue lors du paiement.',
      });

      onError?.(error.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden form for MoneyFusion POST submission */}
      {formData && (
        <form
          ref={formRef}
          method="POST"
          action={formData.paymentUrl}
          style={{ display: 'none' }}
        >
          <input type="hidden" name="totalPrice" value={formData.totalPrice} />
          <input type="hidden" name="article" value={formData.article} />
          <input type="hidden" name="numeroSend" value={formData.numeroSend} />
          <input type="hidden" name="nomclient" value={formData.nomclient} />
          <input type="hidden" name="personal_Info" value={formData.personal_Info} />
          <input type="hidden" name="return_url" value={formData.return_url} />
          <input type="hidden" name="webhook_url" value={formData.webhook_url} />
        </form>
      )}

      <Card className="border-primary/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Paiement Mobile Money</h3>
              <p className="text-sm text-muted-foreground">Orange, MTN, Moov, Wave</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Numéro de téléphone</Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="07 XX XX XX XX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Entrez le numéro associé à votre compte Mobile Money
            </p>
          </div>

          {/* Payment providers logos */}
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-1">
                <span className="text-orange-500 font-bold text-sm">OM</span>
              </div>
              <span className="text-xs text-muted-foreground">Orange</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-1">
                <span className="text-yellow-600 font-bold text-sm">MTN</span>
              </div>
              <span className="text-xs text-muted-foreground">MTN</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-1">
                <span className="text-blue-500 font-bold text-sm">Mv</span>
              </div>
              <span className="text-xs text-muted-foreground">Moov</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-1">
                <span className="text-cyan-500 font-bold text-sm">W</span>
              </div>
              <span className="text-xs text-muted-foreground">Wave</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground mb-1">Montant à payer</p>
        <p className="text-3xl font-bold text-primary">{amount.toLocaleString()} FCFA</p>
      </div>

      <Button
        onClick={handlePayment}
        disabled={isLoading || !phone}
        className="w-full py-6 text-base font-medium rounded-xl"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Redirection vers le paiement...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-2" />
            Payer maintenant
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Vous serez redirigé vers le portail sécurisé MoneyFusion pour effectuer le paiement
      </p>
    </div>
  );
}
