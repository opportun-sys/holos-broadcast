-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id;
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger to assign default viewer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Add embed settings to channels table
ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS embed_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS embed_show_guide BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS embed_primary_color TEXT DEFAULT '#2563EB',
ADD COLUMN IF NOT EXISTS allowed_domains TEXT[] DEFAULT '{}';

-- Create transmission_logs table for TNT monitoring
CREATE TABLE public.transmission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  format TEXT,
  bitrate INTEGER,
  audio_format TEXT,
  protocol TEXT,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transmission_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs of their channels"
ON public.transmission_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.channels
    WHERE channels.id = transmission_logs.channel_id
    AND channels.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create logs for their channels"
ON public.transmission_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.channels
    WHERE channels.id = transmission_logs.channel_id
    AND channels.user_id = auth.uid()
  )
);

-- Add encoding status to video_assets
ALTER TABLE public.video_assets
ADD COLUMN IF NOT EXISTS encoding_status TEXT DEFAULT 'ready',
ADD COLUMN IF NOT EXISTS hls_url TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category TEXT;