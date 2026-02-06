import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CinetPayInitRequest {
  amount: number;
  appointmentId: string;
  patientId: string;
  paymentType: 'deposit' | 'balance';
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  returnUrl: string;
  notifyUrl?: string;
  description?: string;
}

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

    const { 
      amount, 
      appointmentId, 
      patientId, 
      paymentType,
      customerName,
      customerPhone,
      customerEmail,
      returnUrl,
      notifyUrl,
      description = 'Paiement consultation médicale'
    }: CinetPayInitRequest = await req.json();

    // Validate inputs
    if (!amount || amount <= 0) {
      throw new Error('Montant invalide');
    }
    if (!appointmentId || !patientId) {
      throw new Error('ID rendez-vous et ID patient requis');
    }
    if (!customerName || !customerPhone) {
      throw new Error('Nom et téléphone du client requis');
    }

    // Generate unique transaction ID
    const transactionId = `CINET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create payment record in database (pending)
    const { data: paymentRecord, error: insertError } = await supabase
      .from('payments')
      .insert({
        appointment_id: appointmentId,
        patient_id: patientId,
        amount: amount,
        payment_type: paymentType,
        provider: 'cinetpay',
        transaction_ref: transactionId,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating payment record:', insertError);
      throw new Error('Erreur lors de la création du paiement');
    }

    // Determine notify URL
    const webhookUrl = notifyUrl || `${SUPABASE_URL}/functions/v1/cinetpay-webhook`;

    // Initialize CinetPay transaction
    const cinetpayPayload = {
      apikey: CINETPAY_API_KEY,
      site_id: CINETPAY_SITE_ID,
      transaction_id: transactionId,
      amount: amount,
      currency: 'XOF',
      description: description,
      customer_name: customerName,
      customer_surname: '',
      customer_phone_number: customerPhone,
      customer_email: customerEmail || '',
      customer_address: '',
      customer_city: '',
      customer_country: 'CI',
      customer_state: '',
      customer_zip_code: '',
      notify_url: webhookUrl,
      return_url: returnUrl,
      channels: 'ALL',
      metadata: JSON.stringify({
        appointment_id: appointmentId,
        patient_id: patientId,
        payment_id: paymentRecord.id,
        payment_type: paymentType,
      }),
      alternative_currency: '',
      invoice_data: {
        items: [
          {
            name: description,
            quantity: 1,
            unit_price: amount,
            total_price: amount,
          },
        ],
      },
    };

    console.log('Initializing CinetPay transaction:', {
      transactionId,
      amount,
      appointmentId,
    });

    const cinetpayResponse = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cinetpayPayload),
    });

    const cinetpayData = await cinetpayResponse.json();

    if (cinetpayData.code !== '201') {
      console.error('CinetPay initialization failed:', cinetpayData);
      
      // Update payment record to failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentRecord.id);

      throw new Error(cinetpayData.message || 'Échec de l\'initialisation du paiement');
    }

    console.log('CinetPay transaction initialized successfully:', {
      transactionId,
      paymentUrl: cinetpayData.data.payment_url,
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        payment_url: cinetpayData.data.payment_url,
        payment_token: cinetpayData.data.payment_token,
        transaction_id: transactionId,
        payment_id: paymentRecord.id,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('CinetPay initialization error:', error);
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
