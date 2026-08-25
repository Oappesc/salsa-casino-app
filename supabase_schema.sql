-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Niveles (Levels)
CREATE TABLE public.levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar niveles por defecto
INSERT INTO public.levels (name, "order") VALUES 
('Principiante', 1),
('Intermedio', 2),
('Avanzado', 3);

-- 2. Tabla de Sedes (Locations)
CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Grupos (Groups)
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    level_id UUID REFERENCES public.levels(id) ON DELETE RESTRICT,
    schedule TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Extensión de Perfiles de Usuario (Profiles)
-- Esta tabla está vinculada a auth.users de Supabase
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    birthday DATE,
    joined_at DATE DEFAULT CURRENT_DATE,
    role TEXT CHECK (role IN ('student', 'admin', 'instructor')) DEFAULT 'student',
    current_level_id UUID REFERENCES public.levels(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para crear un profile automáticamente cuando un usuario se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'student');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Tabla de Figuras / Pensum (Figures)
CREATE TABLE public.figures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level_id UUID REFERENCES public.levels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de Pagos (Payments)
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT CHECK (status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
    receipt_url TEXT NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabla de Asistencias (Attendances)
CREATE TABLE public.attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, group_id, date)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.figures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura básica (todos los usuarios autenticados pueden leer)
CREATE POLICY "Lectura para usuarios autenticados" ON public.levels FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Lectura para usuarios autenticados" ON public.locations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Lectura para usuarios autenticados" ON public.groups FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Lectura para usuarios autenticados" ON public.figures FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas de Profiles (Los usuarios solo pueden ver y editar su propio perfil, o admins ven todo)
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas de Pagos
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Configuración inicial del Storage para recibos
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Políticas de Storage
CREATE POLICY "Cualquiera puede subir recibos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
CREATE POLICY "Cualquiera puede ver recibos" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
