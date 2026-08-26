"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, XCircle, Search, MessageCircle, MapPin, UserCheck, ShieldAlert, Users, CalendarCheck, FileText, Clock, PlusCircle } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pagos" | "clases" | "alumnos">("pagos");
  const [loading, setLoading] = useState(true);

  // Payments State
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentTab, setPaymentTab] = useState<"pending" | "history">("pending");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "verified" | "rejected">("all");

  // Students State
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Classes State
  const [classMode, setClassMode] = useState<"list" | "create" | "attendance">("list");
  const [classesList, setClassesList] = useState<any[]>([]);
  const [newClassLevel, setNewClassLevel] = useState("Básico I");
  const [newClassDate, setNewClassDate] = useState(new Date().toISOString().split('T')[0]);
  const [newClassLocation, setNewClassLocation] = useState("La Sabana");
  const [newClassSchedule, setNewClassSchedule] = useState("18:30 - 20:00 hrs");
  
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [classAttendances, setClassAttendances] = useState<any[]>([]); // array of {id, user_id, status, profiles: {full_name}}

  useEffect(() => {
    checkAdminAndLoadData();
  }, [activeTab]);

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
    if (activeTab === "clases") loadClasses();
    
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

  const loadClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('*')
      .order('date', { ascending: false });
    if (data) setClassesList(data);
  };

  const formatWhatsappNumber = (phone: string) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, ''); 
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
      const { error, data } = await supabase
        .from('payments')
        .update({ status })
        .eq('id', paymentId)
        .select();

      if (error) throw new Error(`RLS o permisos: ${error.message}`);

      // Actualizar el estado local (sin borrarlo, solo cambiar su status para que se mueva a historial)
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status } : p));

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
      alert("⚠️ No se pudo actualizar el pago.\n\nDetalle: " + err.message);
      loadPayments();
    }
  };

  const handleUpdateStudent = async (studentId: string, sublevel: string, status: string) => {
    await supabase.from('profiles').update({ sublevel, status }).eq('id', studentId);
    alert("Estudiante actualizado");
    loadStudents();
  };

  // ====== LÓGICA DE CLASES ====== //
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Crear Clase
      const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert({
          sublevel: newClassLevel,
          date: newClassDate,
          location: newClassLocation,
          schedule: newClassSchedule
        }).select().single();
      
      if (classError) throw classError;

      // 2. Buscar alumnos del nivel
      const { data: stData } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'student')
        .eq('sublevel', newClassLevel)
        .eq('status', 'Activo');

      if (stData && stData.length > 0) {
        // 3. Crear asistencias 'pending' para cada uno
        const attendancesToInsert = stData.map(s => ({
          class_id: newClass.id,
          user_id: s.id,
          date: newClassDate,
          status: 'pending'
        }));
        await supabase.from('attendances').insert(attendancesToInsert);
      }

      alert(`Clase programada con éxito para ${stData?.length || 0} alumnos.`);
      setClassMode('list');
      loadClasses();
    } catch (error: any) {
      alert("Error al programar la clase: " + error.message);
    }
  };

  const handleSelectClass = async (cls: any) => {
    setSelectedClass(cls);
    setClassMode('attendance');
    const { data } = await supabase
      .from('attendances')
      .select('id, status, user_id, profiles(full_name)')
      .eq('class_id', cls.id)
      .order('profiles(full_name)', { ascending: true });
    
    if (data) setClassAttendances(data);
  };

  const handleMarkAttendance = async (attendanceId: string, status: 'attended' | 'absent' | 'pending') => {
    // Optimistic update
    setClassAttendances(prev => prev.map(a => a.id === attendanceId ? { ...a, status } : a));
    
    const { error } = await supabase.from('attendances').update({ status }).eq('id', attendanceId);
    if (error) {
      alert("Error al actualizar asistencia: " + error.message);
      // Revertir (volviendo a cargar) si falla
      handleSelectClass(selectedClass); 
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
        <button onClick={() => setActiveTab("clases")} className={`flex-1 min-w-[100px] flex flex-col items-center gap-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === "clases" ? "bg-purple-600 text-white shadow-neon-sm" : "text-slate-500 hover:bg-slate-50"}`}>
          <CalendarCheck size={18} /> Clases
        </button>
        <button onClick={() => setActiveTab("alumnos")} className={`flex-1 min-w-[100px] flex flex-col items-center gap-1 py-2 text-xs font-medium rounded-lg transition-colors ${activeTab === "alumnos" ? "bg-purple-600 text-white shadow-neon-sm" : "text-slate-500 hover:bg-slate-50"}`}>
          <Users size={18} /> Alumnos
        </button>
      </div>

      {/* TAB 1: PAGOS */}
      {activeTab === "pagos" && (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-slate-900 mb-2">Validación de Pagos</h2>
          
          <div className="flex gap-2 p-1 bg-slate-200 rounded-lg">
            <button onClick={() => setPaymentTab('pending')} className={`flex-1 py-1.5 text-sm font-medium rounded-md ${paymentTab === 'pending' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500'}`}>
              Pendientes
            </button>
            <button onClick={() => setPaymentTab('history')} className={`flex-1 py-1.5 text-sm font-medium rounded-md ${paymentTab === 'history' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500'}`}>
              Historial
            </button>
          </div>

          {paymentTab === 'history' && (
            <select 
              value={paymentFilter} 
              onChange={(e: any) => setPaymentFilter(e.target.value)}
              className="bg-white border border-slate-200 text-sm p-2 rounded-lg"
            >
              <option value="all">Todos</option>
              <option value="verified">Solo Aprobados</option>
              <option value="rejected">Solo Rechazados</option>
            </select>
          )}

          <div className="flex flex-col gap-3">
            {payments
              .filter(p => {
                if (paymentTab === 'pending') return p.status === 'pending';
                if (paymentFilter === 'all') return p.status !== 'pending';
                return p.status === paymentFilter;
              })
              .map(payment => (
                <div key={payment.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-900">{payment.profiles?.full_name || "Desconocido"}</p>
                      <p className="text-sm text-slate-500">{payment.concept}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(payment.created_at).toLocaleString('es-ES')}</p>
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
                  {payment.receipt_url && (
                    <div className="mt-2">
                      <a href={payment.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                        <Search size={14}/> Ver comprobante
                      </a>
                    </div>
                  )}
                </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CLASES */}
      {activeTab === "clases" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-slate-900">Gestión de Clases</h2>
            {classMode !== 'create' && (
              <button onClick={() => setClassMode('create')} className="text-xs font-semibold bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full flex items-center gap-1">
                <PlusCircle size={14}/> Programar Clase
              </button>
            )}
          </div>

          {classMode === 'list' && (
            <div className="flex flex-col gap-3">
              {classesList.map(cls => (
                <div key={cls.id} onClick={() => handleSelectClass(cls)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-purple-300">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-bold text-slate-900">{cls.sublevel}</p>
                    <span className="text-xs text-slate-500">{new Date(cls.date + 'T12:00:00').toLocaleDateString()}</span>
                  </div>
                  <div className="flex text-xs text-slate-500 gap-4">
                    <span className="flex items-center gap-1"><MapPin size={12}/> {cls.location}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> {cls.schedule}</span>
                  </div>
                </div>
              ))}
              {classesList.length === 0 && <p className="text-sm text-slate-500 text-center mt-4">No hay clases programadas.</p>}
            </div>
          )}

          {classMode === 'create' && (
            <form onSubmit={handleCreateClass} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
              <h3 className="font-semibold text-slate-900 text-sm">Programar Nueva Clase</h3>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Nivel</label>
                <select value={newClassLevel} onChange={e => setNewClassLevel(e.target.value)} className="border border-slate-200 rounded-lg p-2 text-sm bg-slate-50" required>
                  <option value="Básico I">Básico I</option>
                  <option value="Básico II">Básico II</option>
                  <option value="Básico III">Básico III</option>
                  <option value="Intermedio I">Intermedio I</option>
                  <option value="Intermedio II">Intermedio II</option>
                  <option value="Avanzado">Avanzado</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Fecha</label>
                <input type="date" value={newClassDate} onChange={e => setNewClassDate(e.target.value)} className="border border-slate-200 rounded-lg p-2 text-sm bg-slate-50" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Sede</label>
                <input type="text" value={newClassLocation} onChange={e => setNewClassLocation(e.target.value)} className="border border-slate-200 rounded-lg p-2 text-sm bg-slate-50" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Horario</label>
                <input type="text" value={newClassSchedule} onChange={e => setNewClassSchedule(e.target.value)} className="border border-slate-200 rounded-lg p-2 text-sm bg-slate-50" required />
              </div>
              
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => setClassMode('list')} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-semibold">Cancelar</button>
                <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-semibold shadow-neon-sm">Guardar y Notificar</button>
              </div>
            </form>
          )}

          {classMode === 'attendance' && selectedClass && (
            <div className="flex flex-col gap-4">
              <button onClick={() => setClassMode('list')} className="text-xs text-purple-600 font-medium w-fit hover:underline">&larr; Volver a lista de clases</button>
              
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <p className="font-bold text-purple-900">{selectedClass.sublevel}</p>
                <p className="text-xs text-purple-700">{new Date(selectedClass.date + 'T12:00:00').toLocaleDateString()} • {selectedClass.location}</p>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                {classAttendances.map((att: any) => (
                  <div key={att.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
                    <p className="text-sm font-medium text-slate-900">{att.profiles?.full_name || 'Desconocido'}</p>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleMarkAttendance(att.id, 'attended')}
                        className={`p-1.5 rounded-md transition-colors ${att.status === 'attended' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleMarkAttendance(att.id, 'absent')}
                        className={`p-1.5 rounded-md transition-colors ${att.status === 'absent' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}
                      >
                        <XCircle size={16} />
                      </button>
                      <button 
                        onClick={() => handleMarkAttendance(att.id, 'pending')}
                        className={`p-1.5 rounded-md transition-colors ${att.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-slate-100 text-slate-400'}`}
                      >
                        <Clock size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {classAttendances.length === 0 && <p className="text-sm text-slate-500 text-center">No hay alumnos inscritos en esta clase.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ALUMNOS */}
      {activeTab === "alumnos" && (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-slate-900 mb-2">Gestión de Alumnos</h2>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-3 mt-2">
            {filteredStudents.map(student => (
              <div key={student.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                <div>
                  <p className="font-bold text-slate-900 flex justify-between">
                    {student.full_name}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${student.status === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {student.status}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">{student.phone || "Sin teléfono"}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">Nivel</label>
                    <select 
                      value={student.sublevel || "Básico I"}
                      onChange={(e) => handleUpdateStudent(student.id, e.target.value, student.status)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded p-1.5"
                    >
                      <option value="Básico I">Básico I</option>
                      <option value="Básico II">Básico II</option>
                      <option value="Básico III">Básico III</option>
                      <option value="Intermedio I">Intermedio I</option>
                      <option value="Intermedio II">Intermedio II</option>
                      <option value="Avanzado">Avanzado</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">Estatus</label>
                    <select 
                      value={student.status || "Activo"}
                      onChange={(e) => handleUpdateStudent(student.id, student.sublevel, e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded p-1.5"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-slate-100 flex gap-2">
                  <a href={`https://wa.me/${formatWhatsappNumber(student.phone)}`} target="_blank" rel="noreferrer" className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold transition-colors">
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
