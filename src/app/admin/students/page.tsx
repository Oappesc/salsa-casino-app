"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, MessageCircle, Trash2, UserPlus, X, MapPin, CalendarDays, CreditCard, CheckCircle2, ShieldAlert, TrendingUp } from "lucide-react";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({
    full_name: "", email: "", password: "", phone: "", birthday: "", sublevel: "Básico I", role: "student"
  });
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState({ payments: [] as any[], attendances: [] as any[], loading: false });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("full_name", { ascending: true });
    if (data) setStudents(data);
  };

  const formatWhatsappNumber = (phone: string) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, ""); 
    if (cleaned.startsWith("0")) {
      cleaned = "58" + cleaned.slice(1);
    } else if (!cleaned.startsWith("58")) {
      cleaned = "58" + cleaned;
    }
    return cleaned;
  };

  const handleUpdateStudent = async (studentId: string, sublevel: string, status: string) => {
    await supabase.from("profiles").update({ sublevel, status }).eq("id", studentId);
    alert("Estudiante actualizado");
    loadStudents();
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingStudent(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/create-student", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(newStudent),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setStudents(prev => [...prev, result.student].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")));
      setShowCreateModal(false);
      setNewStudent({ full_name: "", email: "", password: "", phone: "", birthday: "", sublevel: "Básico I", role: "student" });
      alert("✅ Estudiante creado exitosamente.");
    } catch (err: any) {
      alert("⚠️ Error al crear estudiante: " + err.message);
    } finally {
      setCreatingStudent(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`¿Estás seguro de eliminar a "${studentName}"?\n\nSe borrará su cuenta, historial de pagos y asistencias. Esta acción no se puede deshacer.`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/delete-student", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ studentId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setStudents(prev => prev.filter(s => s.id !== studentId));
      alert("✅ Estudiante eliminado correctamente.");
    } catch (err: any) {
      alert("⚠️ Error al eliminar estudiante: " + err.message);
    }
  };

  const handleOpenStudentModal = async (student: any) => {
    setSelectedStudentProfile(student);
    setStudentDetails({ payments: [], attendances: [], loading: true });
    
    const [payRes, attRes] = await Promise.all([
      supabase.from("payments").select("*").eq("user_id", student.id).order("created_at", { ascending: false }),
      supabase.from("attendances").select("*, classes(date)").eq("user_id", student.id)
    ]);

    setStudentDetails({
      payments: payRes.data || [],
      attendances: attRes.data || [],
      loading: false
    });
  };

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold text-slate-900">Gestión de Alumnos</h2>
        <button onClick={() => setShowCreateModal(true)} className="text-xs font-semibold bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full flex items-center gap-1">
          <UserPlus size={14}/> Agregar
        </button>
      </div>
      
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
          <div key={student.id} onClick={() => handleOpenStudentModal(student)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 cursor-pointer hover:border-purple-300 transition-colors">
            <div>
              <p className="font-bold text-slate-900 flex justify-between">
                {student.full_name}
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${student.status === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                  {student.status}
                </span>
              </p>
              <p className="text-xs text-slate-500">{student.phone || "Sin teléfono"}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Nivel</label>
                <select 
                  onClick={(e) => e.stopPropagation()}
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
                  onClick={(e) => e.stopPropagation()}
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
              <a href={`https://wa.me/${formatWhatsappNumber(student.phone)}`} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold transition-colors">
                <MessageCircle size={14} /> WhatsApp
              </a>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student.id, student.full_name); }}
                className="bg-red-50 hover:bg-red-100 text-red-600 py-2 px-4 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold transition-colors"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: Crear Estudiante */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><UserPlus size={20} className="text-purple-600" /> Nuevo Estudiante</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={22} /></button>
            </div>
            
            <form onSubmit={handleCreateStudent} className="p-5 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Nombre completo *</label>
                <input type="text" required value={newStudent.full_name} onChange={e => setNewStudent({...newStudent, full_name: e.target.value})} className="border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="Ej: María García" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Correo electrónico *</label>
                <input type="email" required value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} className="border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="correo@ejemplo.com" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Contraseña inicial * (mín. 6 caracteres)</label>
                <input type="password" required minLength={6} value={newStudent.password} onChange={e => setNewStudent({...newStudent, password: e.target.value})} className="border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="••••••" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Teléfono</label>
                  <input type="tel" value={newStudent.phone} onChange={e => setNewStudent({...newStudent, phone: e.target.value})} className="border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-purple-500 focus:outline-none" placeholder="04241234567" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Fecha de Nacimiento</label>
                  <input type="date" value={newStudent.birthday} onChange={e => setNewStudent({...newStudent, birthday: e.target.value})} className="border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Nivel</label>
                  <select value={newStudent.sublevel} onChange={e => setNewStudent({...newStudent, sublevel: e.target.value})} className="border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50">
                    <option value="Básico I">Básico I</option>
                    <option value="Básico II">Básico II</option>
                    <option value="Básico III">Básico III</option>
                    <option value="Intermedio I">Intermedio I</option>
                    <option value="Intermedio II">Intermedio II</option>
                    <option value="Avanzado">Avanzado</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Rol</label>
                  <select value={newStudent.role} onChange={e => setNewStudent({...newStudent, role: e.target.value})} className="border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50">
                    <option value="student">Estudiante</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm font-semibold">Cancelar</button>
                <button type="submit" disabled={creatingStudent} className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg text-sm font-semibold shadow-neon-sm disabled:opacity-50">
                  {creatingStudent ? "Creando..." : "Crear Estudiante"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Perfil del Estudiante */}
      {selectedStudentProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={() => setSelectedStudentProfile(null)}>
          <div className="bg-slate-50 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            
            <div className="bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-bold text-slate-900">Perfil del Estudiante</h3>
              <button onClick={() => setSelectedStudentProfile(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-1.5 rounded-full"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto p-5 flex flex-col gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-lg text-slate-900">{selectedStudentProfile.full_name}</h4>
                <div className="flex flex-col gap-1 mt-2">
                  <p className="text-sm text-slate-600 flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> {selectedStudentProfile.sublevel || "N/A"}</p>
                  <p className="text-sm text-slate-600 flex items-center gap-2"><MessageCircle size={14} className="text-slate-400"/> {selectedStudentProfile.phone || "Sin teléfono"}</p>
                  {selectedStudentProfile.birthday && (
                    <p className="text-sm text-slate-600 flex items-center gap-2"><CalendarDays size={14} className="text-slate-400"/> {new Date(selectedStudentProfile.birthday).toLocaleDateString("es-ES")}</p>
                  )}
                </div>
              </div>

              {studentDetails.loading ? (
                <p className="text-center text-sm text-slate-500 py-4 animate-pulse">Cargando detalles...</p>
              ) : (
                <>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1"><CreditCard size={14}/> Estado de Pago</h5>
                    {(() => {
                      const currentMonthIndex = new Date().getMonth();
                      const currentYear = new Date().getFullYear();
                      const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                      
                      const hasPaid = studentDetails.payments.some(p => {
                        if (p.status !== "verified") return false;
                        const createdDate = new Date(p.created_at);
                        return (createdDate.getMonth() === currentMonthIndex && createdDate.getFullYear() === currentYear) || 
                               (p.concept?.toLowerCase().includes(MONTH_NAMES[currentMonthIndex].toLowerCase()));
                      });

                      return hasPaid ? (
                        <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 p-3 rounded-xl flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-emerald-500" />
                          <span className="font-semibold text-sm">Al día ({MONTH_NAMES[currentMonthIndex]})</span>
                        </div>
                      ) : (
                        <div className="bg-red-50 text-red-700 border border-red-100 p-3 rounded-xl flex items-center gap-2">
                          <ShieldAlert size={18} className="text-red-500" />
                          <span className="font-semibold text-sm">Pendiente / Deudor</span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1"><TrendingUp size={14}/> Asistencia (Histórica)</h5>
                    {(() => {
                      const past = studentDetails.attendances.filter(a => a.classes?.date && new Date(a.classes.date + "T12:00:00") <= new Date());
                      const attended = past.filter(a => a.status === "attended").length;
                      const percent = past.length > 0 ? Math.round((attended / past.length) * 100) : 0;
                      
                      return (
                        <div>
                          <div className="flex justify-between items-end mb-1">
                            <span className="text-2xl font-bold text-slate-900">{percent}%</span>
                            <span className="text-xs text-slate-500 font-medium mb-1">{attended} de {past.length} clases</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${percent >= 75 ? "bg-emerald-500" : percent >= 50 ? "bg-yellow-500" : "bg-red-500"}`} 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cambiar Nivel</h5>
                    <select 
                      value={selectedStudentProfile.sublevel || "Básico I"}
                      onChange={(e) => {
                        handleUpdateStudent(selectedStudentProfile.id, e.target.value, selectedStudentProfile.status);
                        setSelectedStudentProfile({...selectedStudentProfile, sublevel: e.target.value});
                      }}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Básico I">Básico I</option>
                      <option value="Básico II">Básico II</option>
                      <option value="Básico III">Básico III</option>
                      <option value="Intermedio I">Intermedio I</option>
                      <option value="Intermedio II">Intermedio II</option>
                      <option value="Avanzado">Avanzado</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
