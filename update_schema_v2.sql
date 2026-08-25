-- Agregar columnas de status y sublevel a perfiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('Activo', 'Inactivo')) DEFAULT 'Activo',
ADD COLUMN IF NOT EXISTS sublevel TEXT DEFAULT 'Básico I',
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id);

-- Actualizar el trigger para nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, status, sublevel)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'student', 'Activo', 'Básico I');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
