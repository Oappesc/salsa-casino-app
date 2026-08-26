-- =============================================
-- V6: Actualización para Clases y Asistencias
-- =============================================

-- 1. Crear tabla de clases programadas
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sublevel TEXT NOT NULL,
    date DATE NOT NULL,
    location TEXT,
    schedule TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS para la tabla classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage classes"
ON public.classes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Users can view classes"
ON public.classes FOR SELECT
USING (auth.role() = 'authenticated');

-- 3. Actualizar tabla attendances
-- Añadir referencia a la clase
ALTER TABLE public.attendances ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;

-- Eliminar la restricción única anterior (user_id, date) que se creó en v4
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_user_id_date_key;

-- Añadir nueva restricción única para que un usuario no tenga doble asistencia en una misma clase
ALTER TABLE public.attendances ADD CONSTRAINT attendances_user_id_class_id_key UNIQUE (user_id, class_id);
