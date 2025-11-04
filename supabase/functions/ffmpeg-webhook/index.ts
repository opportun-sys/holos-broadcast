import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FFmpegWebhookPayload {
  channelId: string;
  event: 'stream_started' | 'stream_stopped' | 'live_disconnected' | 'source_switched' | 'error';
  timestamp: string;
  data?: any;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json() as FFmpegWebhookPayload;
    
    console.log('FFmpeg webhook received:', payload);

    const { channelId, event, timestamp, data, error } = payload;

    // Log the webhook
    await supabase
      .from('webhook_logs')
      .insert({
        channel_id: channelId,
        event_type: event,
        payload: payload as any,
        response_status: 200,
      });

    // Handle different webhook events
    switch (event) {
      case 'stream_started': {
        await supabase
          .from('channels')
          .update({
            status: 'streaming',
            is_live: true,
            updated_at: timestamp,
          })
          .eq('id', channelId);

        console.log(`Stream started for channel ${channelId}`);
        break;
      }

      case 'stream_stopped': {
        await supabase
          .from('channels')
          .update({
            status: 'offline',
            is_live: false,
            updated_at: timestamp,
          })
          .eq('id', channelId);

        await supabase
          .from('streaming_sessions')
          .update({
            status: 'idle',
            updated_at: timestamp,
          })
          .eq('channel_id', channelId)
          .eq('status', 'streaming');

        console.log(`Stream stopped for channel ${channelId}`);
        break;
      }

      case 'live_disconnected': {
        // Switch to fallback (playlist)
        await supabase
          .from('streaming_sessions')
          .update({
            source_type: 'playlist',
            error_message: 'Live source disconnected, switched to playlist',
            updated_at: timestamp,
          })
          .eq('channel_id', channelId)
          .eq('status', 'streaming');

        console.log(`Live disconnected for channel ${channelId}, switching to playlist`);
        break;
      }

      case 'source_switched': {
        await supabase
          .from('streaming_sessions')
          .update({
            source_type: data?.sourceType || 'playlist',
            updated_at: timestamp,
          })
          .eq('channel_id', channelId)
          .eq('status', 'streaming');

        console.log(`Source switched for channel ${channelId} to ${data?.sourceType}`);
        break;
      }

      case 'error': {
        await supabase
          .from('streaming_sessions')
          .update({
            error_message: error || 'Unknown error',
            updated_at: timestamp,
          })
          .eq('channel_id', channelId)
          .eq('status', 'streaming');

        console.error(`Error for channel ${channelId}:`, error);
        break;
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
