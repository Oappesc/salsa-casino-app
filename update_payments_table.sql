-- Añadir campos de pago y tasa BCV a la tabla de payments
-- Ejecutar esto en el SQL Editor de Supabase si ya creaste la tabla payments original

-- Si ya ejecutaste update_payments_table.sql anterior, solo necesitas:
ALTER TABLE public.payments
	ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('pago_movil', 'usd_cash')) DEFAULT 'pago_movil',
	ADD COLUMN IF NOT EXISTS reference TEXT,
	ADD COLUMN IF NOT EXISTS concept TEXT,
	ADD COLUMN IF NOT EXISTS amount_usd NUMERIC(12, 2),
	ADD COLUMN IF NOT EXISTS amount_bs NUMERIC(12, 2),
	ADD COLUMN IF NOT EXISTS bcv_rate NUMERIC(12, 4);

