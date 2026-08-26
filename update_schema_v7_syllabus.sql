-- ============================================================
-- MIGRATION: Crear tabla syllabus para el Pénsum de Figuras
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Crear la tabla syllabus
CREATE TABLE IF NOT EXISTS public.syllabus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                     -- Nombre de la figura (ej: "Pa Arriba", "Exhíbela")
  sublevel TEXT NOT NULL,                 -- Subnivel al que pertenece (ej: "Básico I", "Intermedio II")
  video_url TEXT,                         -- URL de YouTube / YouTube Shorts (puede ser NULL si no hay video aún)
  order_index INTEGER NOT NULL DEFAULT 0, -- Orden de aparición dentro del subnivel
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Índice para ordenar eficientemente
CREATE INDEX IF NOT EXISTS idx_syllabus_order ON public.syllabus (sublevel, order_index);

-- 3. RLS: Habilitar Row Level Security
ALTER TABLE public.syllabus ENABLE ROW LEVEL SECURITY;

-- 4. Política: Cualquier usuario autenticado puede LEER el syllabus
CREATE POLICY "Authenticated users can read syllabus"
  ON public.syllabus
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. Política: Solo admins pueden INSERT/UPDATE/DELETE
CREATE POLICY "Admins can manage syllabus"
  ON public.syllabus
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 6. Datos de ejemplo iniciales (Básico I) — puedes modificar las URLs
INSERT INTO public.syllabus (name, sublevel, video_url, order_index) VALUES
  ('Pa Arriba',      'Básico I', 'https://youtube.com/shorts/j-Fk70HY_gY', 1),
  ('Paso Básico',    'Básico I', NULL, 2),
  ('Exhíbela',       'Básico I', NULL, 3),
  ('Dile que no',    'Básico I', NULL, 4),
  ('Enchufla',       'Básico II', NULL, 5),
  ('Setenta',        'Intermedio I', NULL, 6);
