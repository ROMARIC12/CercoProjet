import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { reference } = await req.json();

    if (!reference) {
      throw new Error('Transaction reference is required');
    }

    // Verify transaction with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok) {
      console.error('Paystack verification failed:', paystackData);
      throw new Error(paystackData.message || 'Failed to verify transaction');
    }

    const transaction = paystackData.data;
    const isSuccess = transaction.status === 'success';

    // Update payment record in database
    const { data: payment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: isSuccess ? 'success' : 'failed',
        paid_at: isSuccess ? new Date().toISOString() : null,
      })
      .eq('transaction_ref', reference)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating payment record:', updateError);
      throw new Error('Failed to update payment record');
    }

    // If payment successful and it's a deposit, update appointment status
    if (isSuccess && payment.payment_type === 'deposit') {
      await supabase
        .from('appointments')
        .update({ 
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', payment.appointment_id);

      // Create notification for patient
      const { data: appointment } = await supabase
        .from('appointments')
        .select('patient_id, doctor_id, appointment_date, appointment_time')
        .eq('id', payment.appointment_id)
        .single();

      if (appointment) {
        // Get patient profile_id
        const { data: patient } = await supabase
          .from('patients')
          .select('profile_id')
          .eq('id', appointment.patient_id)
          .single();

        if (patient) {
          await supabase
            .from('notifications')
            .insert({
              user_id: patient.profile_id,
              type: 'payment_success',
              title: 'Paiement confirmé',
              message: `Votre paiement de ${payment.amount.toLocaleString()} FCFA a été confirmé. Votre rendez-vous est validé.`,
              data: {
                appointment_id: payment.appointment_id,
                payment_id: payment.id,
                amount: payment.amount,
              },
            });
        }
      }
    }

    console.log('Payment verification completed:', {
      reference,
      status: isSuccess ? 'success' : 'failed',
      paymentId: payment?.id,
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        status: transaction.status,
        amount: transaction.amount / 100, // Convert back from smallest unit
        reference: transaction.reference,
        paid_at: transaction.paid_at,
        channel: transaction.channel,
        payment_id: payment?.id,
        appointment_confirmed: isSuccess && payment?.payment_type === 'deposit',
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({
      success: false,
      error: message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
