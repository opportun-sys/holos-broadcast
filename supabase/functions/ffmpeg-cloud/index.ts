import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FFmpegStartRequest {
  channelId: string;
  action: 'start' | 'stop' | 'status' | 'transmit';
  playlist?: Array<{ type: string; url: string; duration?: number }>;
  outputPath?: string;
  transmission?: {
    protocol: 'udp' | 'rtmp' | 'http';
    target: string;
  };
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

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { channelId, action, playlist, outputPath, transmission } = await req.json() as FFmpegStartRequest;

    // Verify channel ownership
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .eq('user_id', user.id)
      .single();

    if (channelError || !channel) {
      throw new Error('Channel not found or access denied');
    }

    console.log(`FFmpeg Cloud action: ${action} for channel ${channelId}`);

    let ffmpegResponse;

    switch (action) {
      case 'start': {
        // Call FFmpeg Cloud to start streaming
        ffmpegResponse = await fetch('https://api.ffmpeg.cloud/v1/start', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ffmpegApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channelId,
            playlist,
            outputPath: outputPath || `streams/${channelId}`,
          }),
        });

        if (!ffmpegResponse.ok) {
          const errorText = await ffmpegResponse.text();
          console.error('FFmpeg Cloud error:', errorText);
          throw new Error(`FFmpeg Cloud start failed: ${errorText}`);
        }

        const startData = await ffmpegResponse.json();

        // Update channel status and URLs
        await supabase
          .from('channels')
          .update({
            status: 'streaming',
            is_live: true,
            hls_url: startData.hlsUrl || `https://stream.ffmpeg.cloud/${channelId}/playlist.m3u8`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', channelId);

        // Create or update streaming session
        const { data: existingSession } = await supabase
          .from('streaming_sessions')
          .select('*')
          .eq('channel_id', channelId)
          .eq('status', 'streaming')
          .single();

        if (!existingSession) {
          await supabase
            .from('streaming_sessions')
            .insert({
              channel_id: channelId,
              status: 'streaming',
              source_type: 'playlist',
              stream_url: startData.hlsUrl,
              hls_manifest_url: startData.hlsUrl,
              started_at: new Date().toISOString(),
              metadata: { ffmpegCloudId: startData.id },
            });
        }

        console.log('Streaming started successfully:', startData);
        
        return new Response(
          JSON.stringify({
            success: true,
            data: startData,
            hlsUrl: startData.hlsUrl || `https://stream.ffmpeg.cloud/${channelId}/playlist.m3u8`,
            iframeUrl: `https://stream.ffmpeg.cloud/embed/${channelId}`,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'stop': {
        // Call FFmpeg Cloud to stop streaming
        ffmpegResponse = await fetch(`https://api.ffmpeg.cloud/v1/stop/${channelId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ffmpegApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!ffmpegResponse.ok) {
          const errorText = await ffmpegResponse.text();
          console.error('FFmpeg Cloud stop error:', errorText);
          throw new Error(`FFmpeg Cloud stop failed: ${errorText}`);
        }

        // Update channel status
        await supabase
          .from('channels')
          .update({
            status: 'offline',
            is_live: false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', channelId);

        // Update streaming session
        await supabase
          .from('streaming_sessions')
          .update({
            status: 'idle',
            updated_at: new Date().toISOString(),
          })
          .eq('channel_id', channelId)
          .eq('status', 'streaming');

        const stopData = await ffmpegResponse.json();
        console.log('Streaming stopped successfully');

        return new Response(
          JSON.stringify({ success: true, data: stopData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'status': {
        // Get status from FFmpeg Cloud
        ffmpegResponse = await fetch(`https://api.ffmpeg.cloud/v1/status/${channelId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${ffmpegApiKey}`,
          },
        });

        if (!ffmpegResponse.ok) {
          const errorText = await ffmpegResponse.text();
          console.error('FFmpeg Cloud status error:', errorText);
          throw new Error(`FFmpeg Cloud status failed: ${errorText}`);
        }

        const statusData = await ffmpegResponse.json();
        console.log('Status retrieved:', statusData);

        return new Response(
          JSON.stringify({ success: true, data: statusData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'transmit': {
        if (!transmission) {
          throw new Error('Transmission configuration is required');
        }

        // Configure TNT transmission
        ffmpegResponse = await fetch('https://api.ffmpeg.cloud/v1/transmit', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ffmpegApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channelId,
            protocol: transmission.protocol,
            target: transmission.target,
          }),
        });

        if (!ffmpegResponse.ok) {
          const errorText = await ffmpegResponse.text();
          console.error('FFmpeg Cloud transmit error:', errorText);
          throw new Error(`FFmpeg Cloud transmit failed: ${errorText}`);
        }

        const transmitData = await ffmpegResponse.json();

        // Store transmission configuration
        await supabase
          .from('stream_outputs')
          .insert({
            channel_id: channelId,
            protocol: transmission.protocol,
            target_url: transmission.target,
            is_active: true,
          });

        console.log('Transmission configured successfully:', transmitData);

        return new Response(
          JSON.stringify({ success: true, data: transmitData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('FFmpeg Cloud error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
