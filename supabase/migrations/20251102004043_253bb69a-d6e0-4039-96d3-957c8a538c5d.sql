-- Create streaming sessions table
CREATE TABLE IF NOT EXISTS public.streaming_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'starting', 'active', 'stopping', 'error')),
  source_type TEXT CHECK (source_type IN ('playlist', 'live', 'fallback')),
  current_program_id UUID REFERENCES public.program_schedule(id),
  playlist_position INTEGER DEFAULT 0,
  stream_url TEXT,
  hls_manifest_url TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stream outputs table for TNT transmission
CREATE TABLE IF NOT EXISTS public.stream_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.streaming_sessions(id) ON DELETE CASCADE,
  protocol TEXT NOT NULL CHECK (protocol IN ('hls', 'rtmp', 'udp', 'rtp')),
  target_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  quality_profile TEXT DEFAULT 'auto',
  bitrate_kbps INTEGER,
  resolution TEXT,
  last_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create webhook logs table
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create playlist execution logs
CREATE TABLE IF NOT EXISTS public.playlist_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.streaming_sessions(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.program_schedule(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'playing' CHECK (status IN ('playing', 'completed', 'skipped', 'error')),
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.streaming_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_execution_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for streaming_sessions
CREATE POLICY "Users can view their channel sessions"
  ON public.streaming_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = streaming_sessions.channel_id
      AND channels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their channel sessions"
  ON public.streaming_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = streaming_sessions.channel_id
      AND channels.user_id = auth.uid()
    )
  );

-- RLS Policies for stream_outputs
CREATE POLICY "Users can view their channel outputs"
  ON public.stream_outputs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = stream_outputs.channel_id
      AND channels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their channel outputs"
  ON public.stream_outputs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = stream_outputs.channel_id
      AND channels.user_id = auth.uid()
    )
  );

-- RLS Policies for webhook_logs
CREATE POLICY "Users can view their webhook logs"
  ON public.webhook_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = webhook_logs.channel_id
      AND channels.user_id = auth.uid()
    )
  );

-- RLS Policies for playlist_execution_logs
CREATE POLICY "Users can view their playlist logs"
  ON public.playlist_execution_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.streaming_sessions ss
      JOIN public.channels c ON c.id = ss.channel_id
      WHERE ss.id = playlist_execution_logs.session_id
      AND c.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX idx_streaming_sessions_channel ON public.streaming_sessions(channel_id);
CREATE INDEX idx_streaming_sessions_status ON public.streaming_sessions(status);
CREATE INDEX idx_stream_outputs_channel ON public.stream_outputs(channel_id);
CREATE INDEX idx_stream_outputs_session ON public.stream_outputs(session_id);
CREATE INDEX idx_webhook_logs_channel ON public.webhook_logs(channel_id);
CREATE INDEX idx_playlist_logs_session ON public.playlist_execution_logs(session_id);

-- Trigger for updated_at
CREATE TRIGGER update_streaming_sessions_updated_at
  BEFORE UPDATE ON public.streaming_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stream_outputs_updated_at
  BEFORE UPDATE ON public.stream_outputs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get current program for a channel
CREATE OR REPLACE FUNCTION public.get_current_program(p_channel_id UUID)
RETURNS TABLE (
  program_id UUID,
  title TEXT,
  type TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  video_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.title,
    ps.type,
    ps.start_time,
    ps.duration_minutes,
    va.file_url
  FROM public.program_schedule ps
  LEFT JOIN public.video_assets va ON va.id = ps.asset_id
  WHERE ps.channel_id = p_channel_id
    AND ps.start_time <= NOW()
  ORDER BY ps.start_time DESC
  LIMIT 1;
END;
$$;

-- Function to get next program
CREATE OR REPLACE FUNCTION public.get_next_program(p_channel_id UUID)
RETURNS TABLE (
  program_id UUID,
  title TEXT,
  type TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  video_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ps.id,
    ps.title,
    ps.type,
    ps.start_time,
    ps.duration_minutes,
    va.file_url
  FROM public.program_schedule ps
  LEFT JOIN public.video_assets va ON va.id = ps.asset_id
  WHERE ps.channel_id = p_channel_id
    AND ps.start_time > NOW()
  ORDER BY ps.start_time ASC
  LIMIT 1;
END;
$$;