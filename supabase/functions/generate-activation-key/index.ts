import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateKeyRequest {
  durationMonths: 3 | 6 | 12;
  maxUsage?: number;
  count?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autorisation requise' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Accès réservé aux administrateurs' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    const { durationMonths, maxUsage, count = 1 }: GenerateKeyRequest = await req.json();

    if (![3, 6, 12].includes(durationMonths)) {
      return new Response(
        JSON.stringify({ error: 'Durée invalide. Choisir 3, 6 ou 12 mois' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log(`Generating ${count} activation key(s) valid for ${durationMonths} months`);

    const keys = [];
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    for (let i = 0; i < count; i++) {
      // Generate a unique key
      const { data: keyData, error: keyError } = await supabase
        .rpc('generate_activation_key');

      if (keyError) {
        console.error('Error generating key:', keyError);
        throw keyError;
      }

      const generatedKey = keyData;

      // Insert the key into the database
      const { data: insertedKey, error: insertError } = await supabase
        .from('activation_keys')
        .insert({
          key: generatedKey,
          expires_at: expiresAt.toISOString(),
          max_usage: maxUsage || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting key:', insertError);
        throw insertError;
      }

      keys.push(insertedKey);
    }

    console.log(`Successfully generated ${keys.length} activation key(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        keys,
        message: `${keys.length} clé(s) générée(s) avec succès`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error generating activation keys:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
