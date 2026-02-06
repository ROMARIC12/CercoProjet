import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreditCard, Receipt } from 'lucide-react';
import { ReceiptCard } from './ReceiptCard';

interface Payment {
  id: string;
  amount: number;
  payment_type: 'deposit' | 'balance';
  status: 'pending' | 'success' | 'failed';
  provider: string | null;
  transaction_ref: string | null;
  created_at: string;
  paid_at: string | null;
  appointment: {
    appointment_date: string;
    doctor: {
      specialty: string;
      profile: {
        first_name: string;
        last_name: string;
      };
    };
    clinic?: {
      name: string;
    } | null;
  };
}

export function PaymentHistory() {
  const { user, profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!user) return;

      try {
        // Get patient ID
        const { data: patient } = await supabase
          .from('patients')
          .select('id')
          .eq('profile_id', user.id)
          .single();

        if (!patient) return;

        const { data } = await supabase
          .from('payments')
          .select(`
            id,
            amount,
            payment_type,
            status,
            provider,
            transaction_ref,
            created_at,
            paid_at,
            appointment:appointments(
              appointment_date,
              doctor:doctors(
                specialty,
                profile:profiles(first_name, last_name)
              ),
              clinic:clinics(name)
            )
          `)
          .eq('patient_id', patient.id)
          .order('created_at', { ascending: false });

        setPayments(data || []);
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [user]);

  const patientName = profile ? `${profile.first_name} ${profile.last_name}` : '';

  // Filter only successful payments for receipts
  const successfulPayments = payments.filter(p => p.status === 'success');
  const pendingPayments = payments.filter(p => p.status === 'pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Mes reçus et paiements
        </CardTitle>
        <CardDescription>
          Vos transactions et reçus de paiement
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-4">Chargement...</p>
        ) : payments.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Aucun paiement</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {/* Pending payments notice */}
              {pendingPayments.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {pendingPayments.length} paiement(s) en attente
                  </p>
                </div>
              )}

              {/* Successful payments with receipts */}
              {successfulPayments.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Reçus disponibles</h3>
                  {successfulPayments.map((payment) => (
                    <ReceiptCard
                      key={payment.id}
                      receipt={{
                        id: payment.id,
                        amount: payment.amount,
                        transaction_ref: payment.transaction_ref,
                        paid_at: payment.paid_at,
                        created_at: payment.created_at,
                        payment_type: payment.payment_type,
                        doctor_name: `Dr. ${payment.appointment?.doctor?.profile?.first_name} ${payment.appointment?.doctor?.profile?.last_name}`,
                        specialty: payment.appointment?.doctor?.specialty || '',
                        appointment_date: payment.appointment?.appointment_date || '',
                        clinic_name: payment.appointment?.clinic?.name,
                      }}
                      patientName={patientName}
                      patientEmail={user?.email}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
