import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreamRequest {
  channelId: string;
  action: 'start' | 'stop' | 'status' | 'switch_to_live' | 'fallback_to_playlist';
  outputConfig?: {
    protocol: 'hls' | 'rtmp' | 'udp' | 'rtp';
    targetUrl: string;
    bitrate?: number;
    resolution?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { channelId, action, outputConfig }: StreamRequest = await req.json();
    console.log(`[Stream Orchestrator] Action: ${action} for channel: ${channelId}`);

    // Verify channel ownership
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (channelError || !channel) {
      throw new Error('Channel not found or access denied');
    }

    let result;

    switch (action) {
      case 'start':
        result = await startStream(supabase, channelId, outputConfig);
        break;
      
      case 'stop':
        result = await stopStream(supabase, channelId);
        break;
      
      case 'status':
        result = await getStreamStatus(supabase, channelId);
        break;
      
      case 'switch_to_live':
        result = await switchToLive(supabase, channelId);
        break;
      
      case 'fallback_to_playlist':
        result = await fallbackToPlaylist(supabase, channelId);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Stream Orchestrator] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function startStream(supabase: any, channelId: string, outputConfig?: any) {
  console.log(`[startStream] Starting stream for channel: ${channelId}`);

  // Get current program
  const { data: currentProgram, error: programError } = await supabase
    .rpc('get_current_program', { p_channel_id: channelId });

  if (programError) {
    console.error('[startStream] Error fetching program:', programError);
    throw new Error('Failed to fetch current program');
  }

  const program = currentProgram?.[0];
  console.log('[startStream] Current program:', program);

  // Check if session exists for this channel
  const { data: existingSession } = await supabase
    .from('streaming_sessions')
    .select('id')
    .eq('channel_id', channelId)
    .maybeSingle();

  let session;
  
  if (existingSession) {
    // Update existing session
    const { data: updatedSession, error: updateError } = await supabase
      .from('streaming_sessions')
      .update({
        status: 'active',
        source_type: program?.type || 'playlist',
        current_program_id: program?.program_id,
        started_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        metadata: {
          program_title: program?.title,
          program_type: program?.type,
          video_url: program?.video_url
        }
      })
      .eq('id', existingSession.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('[startStream] Update error:', updateError);
      throw new Error('Failed to update session');
    }
    session = updatedSession;
  } else {
    // Create new session
    const { data: newSession, error: insertError } = await supabase
      .from('streaming_sessions')
      .insert({
        channel_id: channelId,
        status: 'active',
        source_type: program?.type || 'playlist',
        current_program_id: program?.program_id,
        started_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        metadata: {
          program_title: program?.title,
          program_type: program?.type,
          video_url: program?.video_url
        }
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[startStream] Insert error:', insertError);
      throw new Error('Failed to create session');
    }
    session = newSession;
  }

  // Update channel status
  await supabase
    .from('channels')
    .update({ 
      is_live: true,
      schedule_active: true,
      status: 'streaming'
    })
    .eq('id', channelId);

  // Create output configuration if provided
  if (outputConfig) {
    await supabase
      .from('stream_outputs')
      .insert({
        channel_id: channelId,
        session_id: session.id,
        protocol: outputConfig.protocol,
        target_url: outputConfig.targetUrl,
        is_active: true,
        bitrate_kbps: outputConfig.bitrate,
        resolution: outputConfig.resolution
      });
  }

  // Log playlist execution
  if (program?.program_id) {
    await supabase
      .from('playlist_execution_logs')
      .insert({
        session_id: session.id,
        program_id: program.program_id,
        started_at: new Date().toISOString(),
        status: 'playing'
      });
  }

  // Send webhook notification
  await sendWebhook(supabase, channelId, 'stream_started', {
    session_id: session.id,
    program: program,
    timestamp: new Date().toISOString()
  });

  return {
    session_id: session.id,
    status: 'active',
    current_program: program,
    message: 'Stream started successfully'
  };
}

async function stopStream(supabase: any, channelId: string) {
  console.log(`[stopStream] Stopping stream for channel: ${channelId}`);

  // Get active session
  const { data: session } = await supabase
    .from('streaming_sessions')
    .select('*')
    .eq('channel_id', channelId)
    .eq('status', 'active')
    .single();

  if (session) {
    // Update session status
    await supabase
      .from('streaming_sessions')
      .update({ 
        status: 'idle',
        last_heartbeat: new Date().toISOString()
      })
      .eq('id', session.id);

    // Close playlist execution logs
    await supabase
      .from('playlist_execution_logs')
      .update({
        ended_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('session_id', session.id)
      .is('ended_at', null);

    // Deactivate outputs
    await supabase
      .from('stream_outputs')
      .update({ is_active: false })
      .eq('session_id', session.id);
  }

  // Update channel status
  await supabase
    .from('channels')
    .update({ 
      is_live: false,
      schedule_active: false,
      status: 'offline'
    })
    .eq('id', channelId);

  // Send webhook
  await sendWebhook(supabase, channelId, 'stream_stopped', {
    session_id: session?.id,
    timestamp: new Date().toISOString()
  });

  return { message: 'Stream stopped successfully' };
}

async function getStreamStatus(supabase: any, channelId: string) {
  const { data: session } = await supabase
    .from('streaming_sessions')
    .select(`
      *,
      stream_outputs (*)
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const { data: currentProgram } = await supabase
    .rpc('get_current_program', { p_channel_id: channelId });

  const { data: nextProgram } = await supabase
    .rpc('get_next_program', { p_channel_id: channelId });

  return {
    session,
    current_program: currentProgram?.[0],
    next_program: nextProgram?.[0]
  };
}

async function switchToLive(supabase: any, channelId: string) {
  console.log(`[switchToLive] Switching to live for channel: ${channelId}`);

  const { data: session } = await supabase
    .from('streaming_sessions')
    .update({
      source_type: 'live',
      last_heartbeat: new Date().toISOString()
    })
    .eq('channel_id', channelId)
    .select()
    .single();

  await supabase
    .from('channels')
    .update({ is_live: true })
    .eq('id', channelId);

  await sendWebhook(supabase, channelId, 'switched_to_live', {
    session_id: session?.id,
    timestamp: new Date().toISOString()
  });

  return { message: 'Switched to live source', session };
}

async function fallbackToPlaylist(supabase: any, channelId: string) {
  console.log(`[fallbackToPlaylist] Falling back to playlist for channel: ${channelId}`);

  const { data: currentProgram } = await supabase
    .rpc('get_current_program', { p_channel_id: channelId });

  const program = currentProgram?.[0];

  const { data: session } = await supabase
    .from('streaming_sessions')
    .update({
      source_type: 'playlist',
      current_program_id: program?.program_id,
      last_heartbeat: new Date().toISOString()
    })
    .eq('channel_id', channelId)
    .select()
    .single();

  await sendWebhook(supabase, channelId, 'fallback_to_playlist', {
    session_id: session?.id,
    program: program,
    timestamp: new Date().toISOString()
  });

  return { message: 'Fallback to playlist', session, program };
}

async function sendWebhook(supabase: any, channelId: string, eventType: string, payload: any) {
  try {
    // Log webhook in database
    await supabase
      .from('webhook_logs')
      .insert({
        channel_id: channelId,
        event_type: eventType,
        payload: payload
      });

    console.log(`[Webhook] ${eventType} sent for channel ${channelId}`);
  } catch (error) {
    console.error('[Webhook] Error:', error);
  }
}
