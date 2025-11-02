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

    const { channelId, action } = await req.json();
    console.log(`[Playlist Manager] Action: ${action} for channel: ${channelId}`);

    let result;

    switch (action) {
      case 'get_playlist':
        result = await getPlaylist(supabase, channelId);
        break;
      
      case 'get_current':
        result = await getCurrentProgram(supabase, channelId);
        break;
      
      case 'advance_to_next':
        result = await advanceToNext(supabase, channelId);
        break;
      
      case 'get_schedule':
        result = await getFullSchedule(supabase, channelId);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Playlist Manager] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function getPlaylist(supabase: any, channelId: string) {
  const now = new Date().toISOString();
  
  const { data: programs, error } = await supabase
    .from('program_schedule')
    .select(`
      *,
      video_assets (
        id,
        title,
        file_url,
        hls_url,
        duration_minutes,
        thumbnail_url
      )
    `)
    .eq('channel_id', channelId)
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch playlist: ${error.message}`);
  }

  // Separate current, past, and future programs
  const currentProgram = programs.find(p => 
    new Date(p.start_time) <= new Date(now) &&
    new Date(p.start_time).getTime() + (p.duration_minutes * 60 * 1000) > new Date(now).getTime()
  );

  const pastPrograms = programs.filter(p => 
    new Date(p.start_time).getTime() + (p.duration_minutes * 60 * 1000) <= new Date(now).getTime()
  );

  const upcomingPrograms = programs.filter(p => 
    new Date(p.start_time) > new Date(now)
  );

  return {
    current: currentProgram,
    past: pastPrograms,
    upcoming: upcomingPrograms,
    total_count: programs.length
  };
}

async function getCurrentProgram(supabase: any, channelId: string) {
  const { data: currentProgram } = await supabase
    .rpc('get_current_program', { p_channel_id: channelId });

  const { data: nextProgram } = await supabase
    .rpc('get_next_program', { p_channel_id: channelId });

  const current = currentProgram?.[0];
  const next = nextProgram?.[0];

  // Calculate progress if current program exists
  let progress = null;
  if (current) {
    const startTime = new Date(current.start_time).getTime();
    const duration = current.duration_minutes * 60 * 1000;
    const now = new Date().getTime();
    const elapsed = now - startTime;
    progress = {
      elapsed_ms: elapsed,
      duration_ms: duration,
      percentage: Math.min(100, Math.max(0, (elapsed / duration) * 100)),
      remaining_ms: Math.max(0, duration - elapsed)
    };
  }

  return {
    current: current ? { ...current, progress } : null,
    next: next
  };
}

async function advanceToNext(supabase: any, channelId: string) {
  console.log(`[advanceToNext] Advancing to next program for channel: ${channelId}`);

  // Get current session
  const { data: session } = await supabase
    .from('streaming_sessions')
    .select('*')
    .eq('channel_id', channelId)
    .eq('status', 'active')
    .single();

  if (!session) {
    throw new Error('No active session found');
  }

  // Mark current program as completed
  if (session.current_program_id) {
    await supabase
      .from('playlist_execution_logs')
      .update({
        ended_at: new Date().toISOString(),
        status: 'completed'
      })
      .eq('session_id', session.id)
      .eq('program_id', session.current_program_id)
      .is('ended_at', null);
  }

  // Get next program
  const { data: nextProgram } = await supabase
    .rpc('get_next_program', { p_channel_id: channelId });

  const next = nextProgram?.[0];

  if (next) {
    // Update session with next program
    await supabase
      .from('streaming_sessions')
      .update({
        current_program_id: next.program_id,
        playlist_position: session.playlist_position + 1,
        last_heartbeat: new Date().toISOString()
      })
      .eq('id', session.id);

    // Create new execution log
    await supabase
      .from('playlist_execution_logs')
      .insert({
        session_id: session.id,
        program_id: next.program_id,
        started_at: new Date().toISOString(),
        status: 'playing'
      });

    return {
      message: 'Advanced to next program',
      program: next
    };
  } else {
    // No more programs, loop back to first or stop
    return {
      message: 'No more programs in playlist',
      action: 'loop_or_stop'
    };
  }
}

async function getFullSchedule(supabase: any, channelId: string) {
  const { data: programs, error } = await supabase
    .from('program_schedule')
    .select(`
      *,
      video_assets (
        id,
        title,
        file_url,
        hls_url,
        duration_minutes,
        thumbnail_url
      )
    `)
    .eq('channel_id', channelId)
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch schedule: ${error.message}`);
  }

  // Get execution logs for tracking
  const { data: logs } = await supabase
    .from('playlist_execution_logs')
    .select('*')
    .in('program_id', programs.map(p => p.id))
    .order('started_at', { ascending: false });

  // Enhance programs with execution history
  const enhancedPrograms = programs.map(program => {
    const programLogs = logs?.filter(l => l.program_id === program.id) || [];
    return {
      ...program,
      execution_count: programLogs.length,
      last_played: programLogs[0]?.started_at,
      last_status: programLogs[0]?.status
    };
  });

  return {
    programs: enhancedPrograms,
    total: programs.length
  };
}
