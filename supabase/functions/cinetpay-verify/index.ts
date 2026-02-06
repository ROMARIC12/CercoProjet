import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const CINETPAY_API_KEY = Deno.env.get('CINETPAY_API_KEY');
    const CINETPAY_SITE_ID = Deno.env.get('CINETPAY_SITE_ID');
    
    if (!CINETPAY_API_KEY || !CINETPAY_SITE_ID) {
      throw new Error('CinetPay credentials not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { transactionId } = await req.json();

    if (!transactionId) {
      throw new Error('ID de transaction requis');
    }

    // Check transaction status with CinetPay
    const checkPayload = {
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: transactionId,
    };

    const cinetpayResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkPayload),
    });

    const cinetpayData = await cinetpayResponse.json();

    console.log('CinetPay verification response:', cinetpayData);

    // Status codes:
    // 00 = Transaction réussie
    // -1, -2, -3, -4 = Transaction échouée ou annulée
    const isSuccess = cinetpayData.code === '00';
    const isPending = cinetpayData.code === '600'; // Transaction en cours

    // Update payment record in database
    const newStatus = isSuccess ? 'success' : (isPending ? 'pending' : 'failed');
    
    const { data: payment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        paid_at: isSuccess ? new Date().toISOString() : null,
      })
      .eq('transaction_ref', transactionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating payment record:', updateError);
      // Don't throw - we still want to return the status
    }

    // If payment successful and it's a deposit, update appointment status
    if (isSuccess && payment?.payment_type === 'deposit') {
      await supabase
        .from('appointments')
        .update({ 
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', payment.appointment_id);

      // Get patient profile_id for notification
      const { data: patientData } = await supabase
        .from('patients')
        .select('profile_id')
        .eq('id', payment.patient_id)
        .single();

      if (patientData) {
        await supabase
          .from('notifications')
          .insert({
            user_id: patientData.profile_id,
            type: 'payment_success',
            title: 'Paiement confirmé ✅',
            message: `Votre paiement de ${payment.amount.toLocaleString()} FCFA a été confirmé. Votre rendez-vous est validé.`,
            data: {
              appointment_id: payment.appointment_id,
              payment_id: payment.id,
              amount: payment.amount,
              transaction_id: transactionId,
            },
          });
      }
    }

    console.log('Payment verification completed:', {
      transactionId,
      status: newStatus,
      paymentId: payment?.id,
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        status: newStatus,
        cinetpay_status: cinetpayData.data?.status || cinetpayData.code,
        amount: cinetpayData.data?.amount || payment?.amount,
        transaction_id: transactionId,
        payment_method: cinetpayData.data?.payment_method || null,
        payment_id: payment?.id,
        appointment_confirmed: isSuccess && payment?.payment_type === 'deposit',
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('CinetPay verification error:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    
    return new Response(JSON.stringify({
      success: false,
      error: message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
