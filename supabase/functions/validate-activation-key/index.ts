import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateKeyRequest {
  key: string;
  machineId?: string;
  ipAddress?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { key, machineId, ipAddress }: ValidateKeyRequest = await req.json();

    console.log('Validating activation key:', { key: key.substring(0, 8) + '...', machineId, ipAddress });

    // Call the validation function
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_activation_key', {
        _key: key,
        _machine_id: machineId || null,
        _ip_address: ipAddress || null,
      });

    if (validationError) {
      console.error('Validation error:', validationError);
      throw validationError;
    }

    const result = validationResult[0];

    if (!result.is_valid) {
      console.log('Key validation failed:', result.message);
      return new Response(
        JSON.stringify({
          success: false,
          message: result.message,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Key is valid - update usage and activation info
    const updateData: any = {
      usage_count: result.usage_count + 1,
      ip_address: ipAddress || null,
    };

    // If this is the first activation, set activated_at
    if (!result.activated_at) {
      updateData.activated_at = new Date().toISOString();
    }

    // If machine_id is provided and not set, lock the key to this machine
    if (machineId && !result.machine_id) {
      updateData.machine_id = machineId;
    }

    const { error: updateError } = await supabase
      .from('activation_keys')
      .update(updateData)
      .eq('id', result.key_id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    // Create an anonymous user session for this activation
    const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

    if (authError) {
      console.error('Auth error:', authError);
      throw authError;
    }

    // Link the key to the user
    await supabase
      .from('activation_keys')
      .update({ user_id: authData.user.id })
      .eq('id', result.key_id);

    console.log('Key activated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Clé d\'activation validée avec succès',
        expiresAt: result.expires_at,
        session: authData.session,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error validating activation key:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
