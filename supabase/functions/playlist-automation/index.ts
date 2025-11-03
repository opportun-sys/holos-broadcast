import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaylistRequest {
  channelId: string;
  action: 'start' | 'stop' | 'next' | 'status';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ffmpegApiKey = Deno.env.get('FFMPEG_CLOUD_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { channelId, action }: PlaylistRequest = await req.json();
    
    console.log(`Playlist automation: ${action} for channel ${channelId}`);

    // Verify channel ownership
    const { data: { user } } = await supabase.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') || ''
    );

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .eq('user_id', user.id)
      .single();

    if (!channel) {
      return new Response(
        JSON.stringify({ error: 'Channel not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'start':
        return await startPlaylist(supabase, channelId, ffmpegApiKey);
      case 'stop':
        return await stopPlaylist(supabase, channelId);
      case 'next':
        return await playNextProgram(supabase, channelId, ffmpegApiKey);
      case 'status':
        return await getPlaylistStatus(supabase, channelId);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Playlist automation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function startPlaylist(supabase: any, channelId: string, ffmpegApiKey: string) {
  console.log(`Starting playlist for channel ${channelId}`);

  // Get the first program in the schedule
  const { data: programs, error: programError } = await supabase
    .from('program_schedule')
    .select(`
      *,
      video_assets (
        file_url,
        hls_url
      )
    `)
    .eq('channel_id', channelId)
    .order('start_time', { ascending: true })
    .limit(1);

  if (programError || !programs || programs.length === 0) {
    throw new Error('No programs found in schedule');
  }

  const currentProgram = programs[0];
  
  // Create or update streaming session
  const { data: session, error: sessionError } = await supabase
    .from('streaming_sessions')
    .upsert({
      channel_id: channelId,
      status: 'active',
      source_type: 'playlist',
      current_program_id: currentProgram.id,
      playlist_position: 0,
      started_at: new Date().toISOString(),
      metadata: {
        program_count: programs.length,
        current_title: currentProgram.title
      }
    })
    .select()
    .single();

  if (sessionError) {
    throw new Error(`Failed to create session: ${sessionError.message}`);
  }

  // Update channel status
  await supabase
    .from('channels')
    .update({
      schedule_active: true,
      is_live: true,
      hls_url: currentProgram.video_assets?.hls_url || currentProgram.video_assets?.file_url
    })
    .eq('id', channelId);

  // Log playlist execution start
  await supabase
    .from('playlist_execution_logs')
    .insert({
      session_id: session.id,
      program_id: currentProgram.id,
      status: 'playing',
      started_at: new Date().toISOString()
    });

  console.log(`Playlist started for channel ${channelId}`);

  return new Response(
    JSON.stringify({
      success: true,
      session_id: session.id,
      current_program: currentProgram.title,
      message: 'Playlist started successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function stopPlaylist(supabase: any, channelId: string) {
  console.log(`Stopping playlist for channel ${channelId}`);

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
        metadata: {
          ...session.metadata,
          stopped_at: new Date().toISOString()
        }
      })
      .eq('id', session.id);

    // Close active playlist logs
    await supabase
      .from('playlist_execution_logs')
      .update({
        status: 'stopped',
        ended_at: new Date().toISOString()
      })
      .eq('session_id', session.id)
      .eq('status', 'playing');
  }

  // Update channel status
  await supabase
    .from('channels')
    .update({
      schedule_active: false,
      is_live: false
    })
    .eq('id', channelId);

  console.log(`Playlist stopped for channel ${channelId}`);

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Playlist stopped successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function playNextProgram(supabase: any, channelId: string, ffmpegApiKey: string) {
  console.log(`Playing next program for channel ${channelId}`);

  // Get active session
  const { data: session } = await supabase
    .from('streaming_sessions')
    .select('*')
    .eq('channel_id', channelId)
    .eq('status', 'active')
    .single();

  if (!session) {
    throw new Error('No active session found');
  }

  // Get next program
  const { data: programs } = await supabase
    .from('program_schedule')
    .select(`
      *,
      video_assets (
        file_url,
        hls_url
      )
    `)
    .eq('channel_id', channelId)
    .order('start_time', { ascending: true })
    .limit(10);

  if (!programs || programs.length === 0) {
    throw new Error('No programs found');
  }

  const nextPosition = (session.playlist_position + 1) % programs.length;
  const nextProgram = programs[nextPosition];

  // Update session
  await supabase
    .from('streaming_sessions')
    .update({
      current_program_id: nextProgram.id,
      playlist_position: nextPosition,
      metadata: {
        ...session.metadata,
        current_title: nextProgram.title
      }
    })
    .eq('id', session.id);

  // Close previous program log
  await supabase
    .from('playlist_execution_logs')
    .update({
      status: 'completed',
      ended_at: new Date().toISOString()
    })
    .eq('session_id', session.id)
    .eq('status', 'playing');

  // Start new program log
  await supabase
    .from('playlist_execution_logs')
    .insert({
      session_id: session.id,
      program_id: nextProgram.id,
      status: 'playing',
      started_at: new Date().toISOString()
    });

  // Update channel HLS URL
  await supabase
    .from('channels')
    .update({
      hls_url: nextProgram.video_assets?.hls_url || nextProgram.video_assets?.file_url
    })
    .eq('id', channelId);

  console.log(`Next program playing for channel ${channelId}`);

  return new Response(
    JSON.stringify({
      success: true,
      current_program: nextProgram.title,
      position: nextPosition,
      message: 'Next program started'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getPlaylistStatus(supabase: any, channelId: string) {
  const { data: session } = await supabase
    .from('streaming_sessions')
    .select(`
      *,
      program_schedule (
        title,
        type,
        duration_minutes
      )
    `)
    .eq('channel_id', channelId)
    .eq('status', 'active')
    .single();

  const { data: logs } = await supabase
    .from('playlist_execution_logs')
    .select('*')
    .eq('session_id', session?.id)
    .order('started_at', { ascending: false })
    .limit(1);

  return new Response(
    JSON.stringify({
      active: !!session,
      session,
      current_log: logs?.[0] || null
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
