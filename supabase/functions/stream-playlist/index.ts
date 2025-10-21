import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { channelId } = await req.json();
    
    if (!channelId) {
      return new Response(
        JSON.stringify({ error: 'Channel ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ffmpegApiKey = Deno.env.get('FFMPEG_CLOUD_API_KEY');

    if (!ffmpegApiKey) {
      throw new Error('FFmpeg Cloud API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching channel and schedule for channel:', channelId);

    // Get channel info
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (channelError) {
      throw new Error(`Channel not found: ${channelError.message}`);
    }

    // Get current and upcoming programs
    const now = new Date().toISOString();
    const { data: schedule, error: scheduleError } = await supabase
      .from('program_schedule')
      .select(`
        *,
        video_assets (
          file_url,
          duration_minutes,
          title
        )
      `)
      .eq('channel_id', channelId)
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(10);

    if (scheduleError) {
      console.error('Schedule error:', scheduleError);
    }

    console.log('Found schedule items:', schedule?.length || 0);

    // Build playlist for FFmpeg Cloud
    const playlist = schedule?.map(item => ({
      url: item.video_assets?.file_url,
      duration: item.duration_minutes * 60,
      title: item.title,
      startTime: item.start_time
    })).filter(item => item.url) || [];

    if (playlist.length === 0) {
      console.log('No videos in playlist, returning placeholder stream');
      return new Response(
        JSON.stringify({ 
          streamUrl: null,
          message: 'No scheduled content available',
          channel: channel.name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating FFmpeg Cloud stream with', playlist.length, 'videos');

    // Call FFmpeg Cloud API to create HLS stream
    const ffmpegResponse = await fetch('https://api.ffmpeg.cloud/v1/streams', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ffmpegApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: playlist.map(item => item.url),
        output: {
          format: 'hls',
          segmentDuration: 10,
          playlist: 'm3u8'
        },
        mode: 'live'
      })
    });

    if (!ffmpegResponse.ok) {
      const errorText = await ffmpegResponse.text();
      console.error('FFmpeg Cloud error:', errorText);
      throw new Error(`FFmpeg Cloud error: ${errorText}`);
    }

    const ffmpegData = await ffmpegResponse.json();
    console.log('FFmpeg Cloud stream created:', ffmpegData);

    // Update channel with new HLS URL
    const { error: updateError } = await supabase
      .from('channels')
      .update({ 
        hls_url: ffmpegData.streamUrl,
        is_live: true,
        status: 'live'
      })
      .eq('id', channelId);

    if (updateError) {
      console.error('Error updating channel:', updateError);
    }

    return new Response(
      JSON.stringify({
        streamUrl: ffmpegData.streamUrl,
        playlist: playlist,
        channel: channel.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in stream-playlist function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
