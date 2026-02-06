import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // CinetPay sends form data
    const formData = await req.formData();
    const transactionId = formData.get('cpm_trans_id') as string;
    const siteId = formData.get('cpm_site_id') as string;
    const amount = formData.get('cpm_amount') as string;
    const currency = formData.get('cpm_currency') as string;
    const paymentMethod = formData.get('cpm_payment_method') as string;
    const phoneNumber = formData.get('cel_phone_num') as string;
    const paymentDate = formData.get('cpm_payment_date') as string;
    const paymentTime = formData.get('cpm_payment_time') as string;
    const errorMessage = formData.get('cpm_error_message') as string;
    const metadata = formData.get('cpm_custom') as string;

    console.log('CinetPay webhook received:', {
      transactionId,
      amount,
      paymentMethod,
      errorMessage,
    });

    // Verify this is a valid callback by checking our database
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('transaction_ref', transactionId)
      .single();

    if (fetchError || !payment) {
      console.error('Payment not found for transaction:', transactionId);
      return new Response('Payment not found', { status: 404 });
    }

    // Check if already processed
    if (payment.status === 'success') {
      console.log('Payment already processed:', transactionId);
      return new Response('OK', { status: 200 });
    }

    // Verify with CinetPay API
    const CINETPAY_API_KEY = Deno.env.get('CINETPAY_API_KEY');
    const CINETPAY_SITE_ID = Deno.env.get('CINETPAY_SITE_ID');

    const verifyResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: CINETPAY_API_KEY,
        site_id: CINETPAY_SITE_ID,
        transaction_id: transactionId,
      }),
    });

    const verifyData = await verifyResponse.json();
    const isSuccess = verifyData.code === '00';

    console.log('CinetPay verification in webhook:', {
      transactionId,
      isSuccess,
      code: verifyData.code,
    });

    // Update payment record
    await supabase
      .from('payments')
      .update({
        status: isSuccess ? 'success' : 'failed',
        paid_at: isSuccess ? new Date().toISOString() : null,
      })
      .eq('id', payment.id);

    // If successful deposit, confirm appointment and notify
    if (isSuccess && payment.payment_type === 'deposit') {
      // Update appointment status
      await supabase
        .from('appointments')
        .update({ 
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', payment.appointment_id);

      // Get appointment details with separate queries to avoid type issues
      const { data: appointment } = await supabase
        .from('appointments')
        .select('patient_id, doctor_id, clinic_id, appointment_date, appointment_time')
        .eq('id', payment.appointment_id)
        .single();

      if (appointment) {
        // Get patient details
        const { data: patientData } = await supabase
          .from('patients')
          .select('profile_id, profile:profiles(first_name, last_name)')
          .eq('id', appointment.patient_id)
          .single();

        // Get doctor details
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('profile_id, profile:profiles(first_name, last_name)')
          .eq('id', appointment.doctor_id)
          .single();

        const patientProfile = (Array.isArray(patientData?.profile) ? patientData?.profile[0] : patientData?.profile) as { first_name: string; last_name: string } | null;
        const doctorProfile = (Array.isArray(doctorData?.profile) ? doctorData?.profile[0] : doctorData?.profile) as { first_name: string; last_name: string } | null;

        const patientName = patientProfile ? `${patientProfile.first_name} ${patientProfile.last_name}` : 'Patient';
        const doctorName = doctorProfile ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}` : 'Médecin';
        const appointmentInfo = `${appointment.appointment_date} à ${appointment.appointment_time}`;

        // Notify patient
        if (patientData?.profile_id) {
          await supabase.from('notifications').insert({
            user_id: patientData.profile_id,
            type: 'payment_success',
            title: 'Paiement confirmé ✅',
            message: `Votre paiement de ${payment.amount.toLocaleString()} FCFA a été reçu. Votre RDV avec ${doctorName} est confirmé.`,
            data: {
              appointment_id: payment.appointment_id,
              amount: payment.amount,
            },
          });
        }

        // Notify doctor
        if (doctorData?.profile_id) {
          await supabase.from('notifications').insert({
            user_id: doctorData.profile_id,
            type: 'new_appointment',
            title: 'Nouveau RDV confirmé (payé)',
            message: `${patientName} a réservé le ${appointmentInfo}. Paiement reçu.`,
            data: {
              appointment_id: payment.appointment_id,
              patient_id: appointment.patient_id,
            },
          });
        }

        // Notify clinic secretaries
        if (appointment.clinic_id) {
          const { data: secretaries } = await supabase
            .from('clinic_secretaries')
            .select('secretary_id')
            .eq('clinic_id', appointment.clinic_id)
            .eq('is_active', true);

          if (secretaries && secretaries.length > 0) {
            const secretaryNotifs = secretaries.map(s => ({
              user_id: s.secretary_id,
              type: 'new_appointment',
              title: 'Nouveau RDV à traiter',
              message: `${patientName} a pris RDV avec ${doctorName} le ${appointmentInfo}. Paiement effectué.`,
              data: {
                appointment_id: payment.appointment_id,
                clinic_id: appointment.clinic_id,
              },
            }));

            await supabase.from('notifications').insert(secretaryNotifs);
          }
        }
      }
    }

    console.log('Webhook processing completed for:', transactionId);

    return new Response('OK', { 
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('CinetPay webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
