import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { studentId } = body

    if (!studentId) {
      return Response.json({ error: 'ID de estudiante requerido.' }, { status: 400 })
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
      return Response.json({ error: 'Solo los administradores pueden eliminar estudiantes.' }, { status: 403 })
    }

    // 1. Eliminar asistencias del usuario
    await supabaseAdmin.from('attendances').delete().eq('user_id', studentId)

    // 2. Eliminar pagos del usuario
    await supabaseAdmin.from('payments').delete().eq('user_id', studentId)

    // 3. Eliminar perfil
    await supabaseAdmin.from('profiles').delete().eq('id', studentId)

    // 4. Eliminar usuario de Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(studentId)

    if (authError) {
      return Response.json({ error: 'Error al eliminar usuario de Auth: ' + authError.message }, { status: 500 })
    }

    return Response.json({ success: true }, { status: 200 })
  } catch (err: any) {
    return Response.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
