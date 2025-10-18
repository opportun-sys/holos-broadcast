-- Create channels table
CREATE TABLE public.channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_live BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'offline' CHECK (status IN ('offline', 'program', 'live')),
  hls_url TEXT,
  rtmp_in_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create program_schedule table for EPG
CREATE TABLE public.program_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vod', 'live')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  asset_id UUID,
  repeat_pattern TEXT CHECK (repeat_pattern IN ('daily', 'weekly', 'none')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_assets table for VOD
CREATE TABLE public.video_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;

-- Channels policies
CREATE POLICY "Users can view their own channels"
  ON public.channels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own channels"
  ON public.channels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channels"
  ON public.channels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own channels"
  ON public.channels FOR DELETE
  USING (auth.uid() = user_id);

-- Program schedule policies
CREATE POLICY "Users can view programs of their channels"
  ON public.program_schedule FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.channels
    WHERE channels.id = program_schedule.channel_id
    AND channels.user_id = auth.uid()
  ));

CREATE POLICY "Users can create programs for their channels"
  ON public.program_schedule FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.channels
    WHERE channels.id = program_schedule.channel_id
    AND channels.user_id = auth.uid()
  ));

CREATE POLICY "Users can update programs of their channels"
  ON public.program_schedule FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.channels
    WHERE channels.id = program_schedule.channel_id
    AND channels.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete programs of their channels"
  ON public.program_schedule FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.channels
    WHERE channels.id = program_schedule.channel_id
    AND channels.user_id = auth.uid()
  ));

-- Video assets policies
CREATE POLICY "Users can view their own assets"
  ON public.video_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assets"
  ON public.video_assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets"
  ON public.video_assets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets"
  ON public.video_assets FOR DELETE
  USING (auth.uid() = user_id);

-- Create function for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add trigger for channels table
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();