import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { full_name, email, password, phone, birthday, sublevel, role } = body

    if (!full_name || !email || !password) {
      return Response.json({ error: 'Nombre, correo y contraseña son obligatorios.' }, { status: 400 })
    }
    if (password.length < 6) {
      return Response.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }

    // Verificar que quien llama es admin
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return Response.json({ error: 'No autorizado' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabaseCaller = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user: callerUser } } = await supabaseCaller.auth.getUser(token)

    if (!callerUser) {
      return Response.json({ error: 'Token inválido' }, { status: 401 })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerUser.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return Response.json({ error: 'Solo los administradores pueden crear estudiantes.' }, { status: 403 })
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    })

    if (authError) {
      return Response.json({ error: 'Error al crear usuario en Auth: ' + authError.message }, { status: 400 })
    }

    const newUserId = authData.user.id

    // 2. Crear perfil en profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUserId,
        full_name,
        email,
        phone: phone || null,
        birthday: birthday || null,
        sublevel: sublevel || 'Básico I',
        role: role || 'student',
        status: 'Activo',
      })

    if (profileError) {
      return Response.json({ error: 'Error al crear perfil: ' + profileError.message }, { status: 500 })
    }

    // 3. Devolver el perfil creado
    const { data: newProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', newUserId)
      .single()

    return Response.json({ student: newProfile }, { status: 201 })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
