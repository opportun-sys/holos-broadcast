import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { channelId, action, data } = await req.json();
    console.log(`[Stream Monitor] Action: ${action}`);

    let result;

    switch (action) {
      case 'heartbeat':
        result = await updateHeartbeat(supabase, channelId, data);
        break;
      
      case 'get_logs':
        result = await getLogs(supabase, channelId, data);
        break;
      
      case 'get_stats':
        result = await getStats(supabase, channelId);
        break;
      
      case 'report_error':
        result = await reportError(supabase, channelId, data);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Stream Monitor] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function updateHeartbeat(supabase: any, channelId: string, data: any) {
  const { data: session, error } = await supabase
    .from('streaming_sessions')
    .update({
      last_heartbeat: new Date().toISOString(),
      metadata: data?.metadata || {}
    })
    .eq('channel_id', channelId)
    .eq('status', 'active')
    .select()
    .single();

  if (error) {
    console.error('[updateHeartbeat] Error:', error);
    throw new Error('Failed to update heartbeat');
  }

  return { message: 'Heartbeat updated', session };
}

async function getLogs(supabase: any, channelId: string, filters: any = {}) {
  const { limit = 100, logType = 'all' } = filters;

  // Get streaming sessions
  const { data: sessions } = await supabase
    .from('streaming_sessions')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Get playlist execution logs
  let playlistLogsQuery = supabase
    .from('playlist_execution_logs')
    .select(`
      *,
      program_schedule (
        title,
        type
      )
    `)
    .order('started_at', { ascending: false });

  if (sessions && sessions.length > 0) {
    playlistLogsQuery = playlistLogsQuery.in('session_id', sessions.map(s => s.id));
  }

  const { data: playlistLogs } = await playlistLogsQuery.limit(limit);

  // Get webhook logs
  const { data: webhookLogs } = await supabase
    .from('webhook_logs')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit);

  // Get transmission logs
  const { data: transmissionLogs } = await supabase
    .from('transmission_logs')
    .select('*')
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return {
    sessions: sessions || [],
    playlist_logs: playlistLogs || [],
    webhook_logs: webhookLogs || [],
    transmission_logs: transmissionLogs || []
  };
}

async function getStats(supabase: any, channelId: string) {
  // Get current active session
  const { data: activeSession } = await supabase
    .from('streaming_sessions')
    .select('*')
    .eq('channel_id', channelId)
    .eq('status', 'active')
    .single();

  // Get total streaming time
  const { data: sessions } = await supabase
    .from('streaming_sessions')
    .select('started_at, updated_at, status')
    .eq('channel_id', channelId);

  let totalStreamingMinutes = 0;
  sessions?.forEach(session => {
    if (session.started_at) {
      const start = new Date(session.started_at).getTime();
      const end = session.status === 'active' 
        ? new Date().getTime()
        : new Date(session.updated_at).getTime();
      totalStreamingMinutes += (end - start) / (1000 * 60);
    }
  });

  // Get programs played count
  const { count: programsPlayed } = await supabase
    .from('playlist_execution_logs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')
    .in('session_id', sessions?.map(s => s.id) || []);

  // Get error count
  const { count: errorCount } = await supabase
    .from('streaming_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', channelId)
    .eq('status', 'error');

  // Get outputs status
  const { data: outputs } = await supabase
    .from('stream_outputs')
    .select('*')
    .eq('channel_id', channelId)
    .eq('is_active', true);

  return {
    is_active: !!activeSession,
    active_session: activeSession,
    total_streaming_minutes: Math.round(totalStreamingMinutes),
    programs_played: programsPlayed || 0,
    error_count: errorCount || 0,
    active_outputs: outputs?.length || 0,
    outputs: outputs || []
  };
}

async function reportError(supabase: any, channelId: string, errorData: any) {
  console.error(`[reportError] Channel ${channelId}:`, errorData);

  // Update session with error
  const { error: updateError } = await supabase
    .from('streaming_sessions')
    .update({
      status: 'error',
      error_message: errorData.message,
      last_heartbeat: new Date().toISOString()
    })
    .eq('channel_id', channelId)
    .eq('status', 'active');

  if (updateError) {
    console.error('[reportError] Failed to update session:', updateError);
  }

  // Send webhook for error
  await supabase
    .from('webhook_logs')
    .insert({
      channel_id: channelId,
      event_type: 'stream_error',
      payload: errorData
    });

  return { message: 'Error reported' };
}
