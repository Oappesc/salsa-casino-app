CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Asignar rol de admin al correo específico
  IF new.email = 'oappesc@gmail.com' THEN
    user_role := 'admin';
  ELSE
    user_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, full_name, role, status, sublevel)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', user_role, 'Activo', 'Básico I');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Forzar actualización si el usuario ya fue creado
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'oappesc@gmail.com');
