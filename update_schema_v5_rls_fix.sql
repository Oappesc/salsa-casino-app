-- =============================================
-- FIX: Políticas de RLS para Admin
-- =============================================

-- 1. PAGOS: Permitir al admin leer TODOS los pagos
CREATE POLICY "Admin can view all payments"
ON public.payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 2. PAGOS: Permitir al admin ACTUALIZAR cualquier pago (aprobar/rechazar)
CREATE POLICY "Admin can update any payment"
ON public.payments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 3. PERFILES: Permitir al admin leer TODOS los perfiles
CREATE POLICY "Admin can view all profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS admin_profile
    WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
  )
);

-- 4. PERFILES: Permitir al admin ACTUALIZAR cualquier perfil (cambiar nivel, estatus)
CREATE POLICY "Admin can update any profile"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles AS admin_profile
    WHERE admin_profile.id = auth.uid() AND admin_profile.role = 'admin'
  )
);

-- 5. ASISTENCIAS: Permitir al admin leer TODAS las asistencias
CREATE POLICY "Admin can view all attendances"
ON public.attendances FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 6. ASISTENCIAS: Permitir al admin INSERTAR asistencias para cualquier alumno
CREATE POLICY "Admin can insert any attendance"
ON public.attendances FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 7. ASISTENCIAS: Permitir al admin ACTUALIZAR asistencias
CREATE POLICY "Admin can update any attendance"
ON public.attendances FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 8. ASISTENCIAS: Permitir al alumno leer sus propias asistencias (para el dashboard)
CREATE POLICY "Users can view own attendances"
ON public.attendances FOR SELECT
USING (auth.uid() = user_id);
