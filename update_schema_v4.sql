-- Agregar columna status a asistencias
ALTER TABLE public.attendances 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'attended', 'absent')) DEFAULT 'pending';

-- Hacer que group_id sea opcional para simplificar el registro si no hay grupos creados
ALTER TABLE public.attendances ALTER COLUMN group_id DROP NOT NULL;

-- Actualizar restricción única para que permita upsert por user_id y date
ALTER TABLE public.attendances DROP CONSTRAINT IF EXISTS attendances_user_id_group_id_date_key;
ALTER TABLE public.attendances ADD CONSTRAINT attendances_user_id_date_key UNIQUE (user_id, date);
