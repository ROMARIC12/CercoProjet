import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PaystackInitRequest {
  amount: number; // Amount in FCFA
  email: string;
  appointmentId: string;
  patientId: string;
  paymentType: 'deposit' | 'balance';
  provider?: string;
  callbackUrl?: string;
}

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

    const { 
      amount, 
      email, 
      appointmentId, 
      patientId, 
      paymentType,
      provider = 'paystack',
      callbackUrl
    }: PaystackInitRequest = await req.json();

    // Validate inputs
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }
    if (!email) {
      throw new Error('Email is required');
    }
    if (!appointmentId || !patientId) {
      throw new Error('Appointment ID and Patient ID are required');
    }

    // Generate unique reference
    const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create payment record in database (pending)
    const { data: paymentRecord, error: insertError } = await supabase
      .from('payments')
      .insert({
        appointment_id: appointmentId,
        patient_id: patientId,
        amount: amount,
        payment_type: paymentType,
        provider: provider,
        transaction_ref: reference,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating payment record:', insertError);
      throw new Error('Failed to create payment record');
    }

    // Initialize Paystack transaction
    // Paystack expects amount in kobo (smallest currency unit)
    // For FCFA, we use the actual amount (Paystack handles XOF)
    const paystackAmount = amount * 100; // Convert to smallest unit

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        amount: paystackAmount,
        currency: 'XOF', // CFA Franc
        reference: reference,
        callback_url: callbackUrl,
        metadata: {
          appointment_id: appointmentId,
          patient_id: patientId,
          payment_id: paymentRecord.id,
          payment_type: paymentType,
        },
      }),
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Paystack initialization failed:', paystackData);
      
      // Update payment record to failed
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentRecord.id);

      throw new Error(paystackData.message || 'Failed to initialize payment');
    }

    console.log('Paystack transaction initialized:', {
      reference,
      appointmentId,
      amount,
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: paystackData.data.reference,
        payment_id: paymentRecord.id,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Payment initialization error:', error);
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
