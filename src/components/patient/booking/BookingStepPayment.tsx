import { useState } from 'react';
import { ChevronRight, CreditCard, Smartphone, Wallet, Lock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  balance?: number;
}

interface BookingStepPaymentProps {
  doctorName: string;
  consultationAmount: number;
  serviceFee: number;
  totalAmount: number;
  onPay: (method: string) => void;
  isLoading?: boolean;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'card',
    name: 'Carte Bancaire',
    description: 'Visa, Mastercard, Maestro',
    icon: CreditCard,
  },
  {
    id: 'mobile_money',
    name: 'Mobile Money',
    description: 'Orange Money, MTN, Moov, Wave',
    icon: Smartphone,
  },
  {
    id: 'wallet',
    name: 'Portefeuille KÔKÔ',
    description: 'Solde disponible: 5.000 FCFA',
    icon: Wallet,
    balance: 5000,
  },
];

export function BookingStepPayment({
  doctorName,
  consultationAmount,
  serviceFee,
  totalAmount,
  onPay,
  isLoading,
}: BookingStepPaymentProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('card');

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR');
  };

  return (
    <div className="flex flex-col h-full bg-[#f5f7fa]">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Order Summary */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">
              Résumé de la commande
            </h2>
            <div className="bg-white rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Consultation {doctorName}</span>
                <span className="font-medium">{formatAmount(consultationAmount)} FCFA</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Frais de service</span>
                <span className="font-medium">{formatAmount(serviceFee)} FCFA</span>
              </div>
              <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between items-center">
                <span className="font-semibold text-foreground">Total à payer</span>
                <span className="font-bold text-[#1a5fb4] text-lg">{formatAmount(totalAmount)} FCFA</span>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">
              Mode de paiement
            </h2>
            <div className="space-y-3">
              {paymentMethods.map((method) => {
                const isSelected = selectedMethod === method.id;
                const Icon = method.icon;

                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-2xl bg-white border-2 transition-all text-left',
                      isSelected
                        ? 'border-[#1a5fb4] shadow-sm'
                        : 'border-transparent hover:border-gray-200'
                    )}
                  >
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      method.id === 'card' && 'bg-blue-100 text-blue-600',
                      method.id === 'mobile_money' && 'bg-orange-100 text-orange-600',
                      method.id === 'wallet' && 'bg-emerald-100 text-emerald-600'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{method.name}</p>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                    <div className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                      isSelected
                        ? 'border-[#1a5fb4] bg-[#1a5fb4]'
                        : 'border-gray-300'
                    )}>
                      {isSelected && <Check className="h-4 w-4 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-6 bg-blue-100 rounded flex items-center justify-center text-xs font-bold text-blue-600">
                VISA
              </div>
              <div className="w-10 h-6 bg-orange-100 rounded flex items-center justify-center text-xs font-bold text-orange-600">
                MC
              </div>
              <div className="w-10 h-6 bg-amber-100 rounded flex items-center justify-center text-xs font-bold text-amber-600">
                OM
              </div>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Lock className="h-4 w-4" />
              <span>TRANSACTION 100% SÉCURISÉE</span>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Pay Button */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <Button
          onClick={() => onPay(selectedMethod)}
          disabled={isLoading}
          className="w-full h-14 rounded-2xl bg-[#1a5fb4] hover:bg-[#1a4b9c] text-white font-semibold text-base"
        >
          Payer {formatAmount(totalAmount)} FCFA
          <ChevronRight className="h-5 w-5 ml-2" />
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-3">
          En confirmant ce paiement, vous acceptez les conditions générales de vente et d'utilisation de KÔKÔ SANTÉ.
        </p>
      </div>
    </div>
  );
}
