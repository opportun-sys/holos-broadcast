-- Assign admin role to the administrator email
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user_id for the admin email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'thiernodk2@gmail.com';
  
  -- If the user exists, insert admin role (only if not already exists)
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;