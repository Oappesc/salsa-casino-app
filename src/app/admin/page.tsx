"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, XCircle, Search, MessageCircle, MapPin, UserCheck, ShieldAlert, Users, CalendarCheck, FileText, Clock } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pagos" | "asistencia" | "alumnos">("pagos");
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Asistencia states
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attLevel, setAttLevel] = useState("Básico I");
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [classAttendances, setClassAttendances] = useState<Record<string, string>>({}); // userId -> status
  const [loadingAttendances, setLoadingAttendances] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "asistencia") {
      loadClassData();
    }
  }, [attDate, attLevel, activeTab]);

  const checkAdminAndLoadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      router.push("/dashboard");
      return;
    }

    if (activeTab === "pagos") loadPayments();
    if (activeTab === "alumnos") loadStudents();
    
    setLoading(false);
  };

  const loadPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*, profiles(full_name, phone)')
      .order('created_at', { ascending: false });
    if (data) setPayments(data);
  };

  const loadStudents = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .order('full_name', { ascending: true });
    if (data) setStudents(data);
  };

  const loadClassData = async () => {
    setLoadingAttendances(true);
    // Fetch students in this level
    const { data: stData } = await supabase
      .from('profiles')
      .select('id, full_name, sublevel')
      .eq('role', 'student')
      .eq('sublevel', attLevel)
      .eq('status', 'Activo')
      .order('full_name', { ascending: true });

    if (stData) setClassStudents(stData);
    else setClassStudents([]);

    // Fetch existing attendances for this date
    const { data: attData } = await supabase
      .from('attendances')
      .select('user_id, status')
      .eq('date', attDate);

    const attMap: Record<string, string> = {};
    if (attData) {
      attData.forEach(a => {
        attMap[a.user_id] = a.status || 'pending';
      });
    }
    setClassAttendances(attMap);
    setLoadingAttendances(false);
  };

  const formatWhatsappNumber = (phone: string) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, ''); // Deja solo números
    if (cleaned.startsWith('0')) {
      cleaned = '58' + cleaned.slice(1);
    } else if (!cleaned.startsWith('58')) {
      cleaned = '58' + cleaned;
    }
    return cleaned;
  };

  const handleUpdatePayment = async (paymentId: string, status: 'verified' | 'rejected', phone: string, studentName: string, concept: string) => {
    const safeConcept = concept || 'Mensualidad';
    const safeStudentName = studentName || 'Estudiante';

    try {
      // 1. Persistir en Supabase PRIMERO
      const { error, data } = await supabase
        .from('payments')
        .update({ status })
        .eq('id', paymentId)
        .select();

      if (error) {
        console.error('Supabase update error:', error);
        throw new Error(`RLS o permisos: ${error.message} (code: ${error.code})`);
      }

      console.log('Payment updated in DB:', data);

      // 2. Solo si la BD confirmó, quitar de la lista local
      setPayments(prev => prev.filter(p => p.id !== paymentId));

      // 3. WhatsApp
      if (phone) {
        let msg = "";
        if (status === 'verified') {
          msg = `¡Hola ${safeStudentName}!\n\nTu pago por el concepto de *${safeConcept}* ha sido *Validado* exitosamente.\n\n¡Gracias por formar parte de la Familia Rumbera!`;
        } else if (status === 'rejected') {
          msg = `¡Hola ${safeStudentName}!\n\nHubo un inconveniente con la verificación de tu pago por el concepto de *${safeConcept}*. Por favor, revisa tu comprobante o contáctanos para aclarar la situación.\n\nAtentamente, Familia Rumbera.`;
        }
        const formattedPhone = formatWhatsappNumber(phone);
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } catch (err: any) {
      console.error('Error completo:', err);
      alert("⚠️ No se pudo actualizar el pago en Supabase.\n\nDetalle: " + err.message + "\n\nAsegúrate de haber ejecutado el script update_schema_v5_rls_fix.sql en el SQL Editor de Supabase.");
      // NO eliminamos de la lista; recargamos para reflejar el estado real
      loadPayments();
    }
  };

  const handleUpdateStudent = async (studentId: string, sublevel: string, status: string) => {
    await supabase.from('profiles').update({ sublevel, status }).eq('id', studentId);
    alert("Estudiante actualizado");
    loadStudents();
  };

  const markAttendance = async (studentId: string, status: 'attended' | 'absent' | 'pending') => {
    // Optimistic update
    setClassAttendances(prev => ({ ...prev, [studentId]: status }));

    // Upsert into DB (assuming unique constraint user_id + date exists)
    const { error } = await supabase
      .from('attendances')
      .upsert({ 
        user_id: studentId, 
        date: attDate,
        status: status 
      }, { onConflict: 'user_id,date' });

    if (error) {
      alert("Error al guardar asistencia");
      loadClassData(); // Revert on error
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center items-center h-screen"><p className="text-slate-500">Verificando accesos...</p></div>;

  return (
    <div className="flex flex-col min-h-screen px-6 pt-8 pb-24 bg-slate-50">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de Control</h1>
          <p className="text-slate-500 text-sm mt-1">Administración de la academia</p>
        </div>
        <div className="bg-purple-100 p-3 rounded-full">
          <ShieldAlert className="text-purple-600" size={24} />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl mb-6 shadow-sm overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveTab("pagos")} className={`flex-1 min-w-[100px] flex flex-col items-center gap-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === "pagos" ? "bg-purple-600 text-white shadow-neon-sm" : "text-slate-500 hover:bg-slate-50"}`}>
          <FileText size={18} /> Pagos
        </button>
        <button onClick={() => setActiveTab("asistencia")} className={`flex-1 min-w-[100px] flex flex-col items-center gap-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === "asistencia" ? "bg-purple-600 text-white shadow-neon-sm" : "text-slate-500 hover:bg-slate-50"}`}>
          <CalendarCheck size={18} /> Asistencia
        </button>
        <button onClick={() => setActiveTab("alumnos")} className={`flex-1 min-w-[100px] flex flex-col items-center gap-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === "alumnos" ? "bg-purple-600 text-white shadow-neon-sm" : "text-slate-500 hover:bg-slate-50"}`}>
          <Users size={18} /> Alumnos
        </button>
      </div>

      {/* TAB 1: PAGOS */}
      {activeTab === "pagos" && (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-slate-900 mb-2">Validación de Pagos</h2>
          {payments.length === 0 ? <p className="text-sm text-slate-500">No hay pagos registrados.</p> : null}
          
          {payments.map(payment => (
            <div key={payment.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-900">{payment.profiles?.full_name || "Desconocido"}</p>
                  <p className="text-sm text-slate-500">{payment.concept}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                  payment.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 
                  payment.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {payment.status.toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between text-sm items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                <p><strong>Monto:</strong> ${payment.amount}</p>
                <p><strong>Ref:</strong> {payment.reference || "Efectivo"}</p>
              </div>

              {payment.status === 'pending' && (
                <div className="flex gap-2 mt-1">
                  <button onClick={() => handleUpdatePayment(payment.id, 'verified', payment.profiles?.phone, payment.profiles?.full_name, payment.concept)} className="flex-1 bg-emerald-50 text-emerald-600 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                    <CheckCircle2 size={16} /> Aprobar
                  </button>
                  <button onClick={() => handleUpdatePayment(payment.id, 'rejected', payment.profiles?.phone, payment.profiles?.full_name, payment.concept)} className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 border border-red-200 hover:bg-red-100 transition-colors">
                    <XCircle size={16} /> Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: ASISTENCIA */}
      {activeTab === "asistencia" && (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-slate-900 mb-2">Crear Clase / Asistencia</h2>
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Sede y Horario (Fijo)</label>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-sm text-slate-700">
                La Sabana • 18:30 - 20:00 hrs
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Fecha</label>
                <input 
                  type="date" 
                  value={attDate}
                  onChange={e => setAttDate(e.target.value)}
                  className="bg-white border border-slate-200 p-2.5 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Nivel/Grupo</label>
                <select 
                  value={attLevel}
                  onChange={e => setAttLevel(e.target.value)}
                  className="bg-white border border-slate-200 p-2.5 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Básico I">Básico I</option>
                  <option value="Básico II">Básico II</option>
                  <option value="Básico III">Básico III</option>
                  <option value="Básico IV">Básico IV</option>
                  <option value="Intermedio I">Intermedio I</option>
                  <option value="Intermedio II">Intermedio II</option>
                  <option value="Avanzado I">Avanzado I</option>
                </select>
              </div>
            </div>
          </div>

          <h3 className="font-semibold text-slate-900 mt-2">Lista de Alumnos</h3>
          {loadingAttendances ? (
            <p className="text-sm text-slate-500">Cargando alumnos...</p>
          ) : classStudents.length === 0 ? (
            <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200">No hay alumnos activos en este nivel.</p>
          ) : (
            classStudents.map(student => {
              const status = classAttendances[student.id] || 'pending';
              return (
                <div key={student.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-slate-900">{student.full_name}</p>
                    <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">{student.sublevel}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => markAttendance(student.id, 'pending')} 
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                    >
                      <Clock size={14} /> Pdt.
                    </button>
                    <button 
                      onClick={() => markAttendance(student.id, 'attended')} 
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${status === 'attended' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                    >
                      <CheckCircle2 size={14} /> Asistió
                    </button>
                    <button 
                      onClick={() => markAttendance(student.id, 'absent')} 
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${status === 'absent' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                    >
                      <XCircle size={14} /> Faltó
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: ALUMNOS */}
      {activeTab === "alumnos" && (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-slate-900 mb-1">Gestión de Alumnos</h2>
          
          <div className="relative mb-2">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar alumno..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
            />
          </div>

          {filteredStudents.map(student => (
            <div key={student.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <div>
                <p className="font-bold text-slate-900">{student.full_name}</p>
                <p className="text-xs text-slate-500">{student.phone || "Sin teléfono"}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Nivel</label>
                  <select 
                    value={student.sublevel || "Básico I"}
                    onChange={(e) => handleUpdateStudent(student.id, e.target.value, student.status)}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-700 outline-none"
                  >
                    <option value="Básico I">Básico I</option>
                    <option value="Básico II">Básico II</option>
                    <option value="Básico III">Básico III</option>
                    <option value="Básico IV">Básico IV</option>
                    <option value="Intermedio I">Intermedio I</option>
                    <option value="Intermedio II">Intermedio II</option>
                    <option value="Avanzado I">Avanzado I</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Estatus</label>
                  <select 
                    value={student.status || "Activo"}
                    onChange={(e) => handleUpdateStudent(student.id, student.sublevel, e.target.value)}
                    className={`border rounded-lg p-2 text-xs font-bold outline-none ${
                      student.status === 'Activo' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          
          {filteredStudents.length === 0 && (
            <p className="text-sm text-center text-slate-500 py-4">No se encontraron alumnos.</p>
          )}
        </div>
      )}
    </div>
  );
}
