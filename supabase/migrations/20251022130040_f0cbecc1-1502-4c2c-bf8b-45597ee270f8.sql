-- Create activation_keys table
CREATE TABLE public.activation_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  max_usage INTEGER,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  machine_id TEXT,
  ip_address TEXT,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.activation_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all keys
CREATE POLICY "Admins can manage all activation keys"
ON public.activation_keys
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Users can view their own activated key
CREATE POLICY "Users can view their own activation key"
ON public.activation_keys
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_activation_keys_key ON public.activation_keys(key);
CREATE INDEX idx_activation_keys_user_id ON public.activation_keys(user_id);
CREATE INDEX idx_activation_keys_is_active ON public.activation_keys(is_active);

-- Function to generate random activation key
CREATE OR REPLACE FUNCTION public.generate_activation_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_length INTEGER := 25;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..5 LOOP
    IF i > 1 THEN
      result := result || '-';
    END IF;
    FOR j IN 1..5 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
  END LOOP;
  RETURN result;
END;
$$;

-- Function to validate activation key
CREATE OR REPLACE FUNCTION public.validate_activation_key(
  _key TEXT,
  _machine_id TEXT DEFAULT NULL,
  _ip_address TEXT DEFAULT NULL
)
RETURNS TABLE(
  is_valid BOOLEAN,
  message TEXT,
  key_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_record RECORD;
BEGIN
  -- Find the key
  SELECT * INTO key_record
  FROM public.activation_keys
  WHERE key = _key;

  -- Key doesn't exist
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Clé d''activation invalide'::TEXT, NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  -- Key is not active
  IF NOT key_record.is_active THEN
    RETURN QUERY SELECT false, 'Cette clé a été désactivée'::TEXT, key_record.id, key_record.expires_at;
    RETURN;
  END IF;

  -- Key has expired
  IF key_record.expires_at < now() THEN
    RETURN QUERY SELECT false, 'Cette clé a expiré'::TEXT, key_record.id, key_record.expires_at;
    RETURN;
  END IF;

  -- Check usage limit
  IF key_record.max_usage IS NOT NULL AND key_record.usage_count >= key_record.max_usage THEN
    RETURN QUERY SELECT false, 'Limite d''utilisation atteinte'::TEXT, key_record.id, key_record.expires_at;
    RETURN;
  END IF;

  -- Check machine ID if previously set
  IF key_record.machine_id IS NOT NULL AND _machine_id IS NOT NULL AND key_record.machine_id != _machine_id THEN
    RETURN QUERY SELECT false, 'Cette clé est liée à un autre appareil'::TEXT, key_record.id, key_record.expires_at;
    RETURN;
  END IF;

  -- Key is valid
  RETURN QUERY SELECT true, 'Clé valide'::TEXT, key_record.id, key_record.expires_at;
END;
$$;