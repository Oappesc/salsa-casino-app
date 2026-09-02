"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Clock, PlusCircle, XCircle, CheckCircle2 } from "lucide-react";

export default function AdminClassesPage() {
  const [classMode, setClassMode] = useState<"list" | "create" | "attendance">("list");
  const [classesList, setClassesList] = useState<any[]>([]);
  const [newClassLevel, setNewClassLevel] = useState("Básico I");
  const [newClassDate, setNewClassDate] = useState(new Date().toISOString().split("T")[0]);
  const [newClassLocation, setNewClassLocation] = useState("La Sabana");
  const [newClassSchedule, setNewClassSchedule] = useState("18:30 - 20:00 hrs");
  
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [classAttendances, setClassAttendances] = useState<any[]>([]);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const { data } = await supabase.from("classes").select("*").order("date", { ascending: false });
    if (data) setClassesList(data);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: newClass, error: classError } = await supabase
        .from("classes")
        .insert({
          sublevel: newClassLevel,
          date: newClassDate,
          location: newClassLocation,
          schedule: newClassSchedule
        }).select().single();
      
      if (classError) throw classError;

      const { data: stData } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "student")
        .eq("sublevel", newClassLevel)
        .eq("status", "Activo");

      if (stData && stData.length > 0) {
        const attendancesToInsert = stData.map(s => ({
          class_id: newClass.id,
          user_id: s.id,
          date: newClassDate,
          status: "pending"
        }));
        await supabase.from("attendances").insert(attendancesToInsert);
      }

      alert(`Clase programada con éxito para ${stData?.length || 0} alumnos.`);
      setClassMode("list");
      loadClasses();
    } catch (error: any) {
      alert("Error al programar la clase: " + error.message);
    }
  };

  const handleSelectClass = async (cls: any) => {
    setSelectedClass(cls);
    setClassMode("attendance");
    const { data } = await supabase
      .from("attendances")
      .select("id, status, user_id, profiles(full_name)")
      .eq("class_id", cls.id)
      .order("profiles(full_name)", { ascending: true });
    
    if (data) setClassAttendances(data);
  };

  const handleMarkAttendance = async (attendanceId: string, status: "attended" | "absent" | "pending") => {
    setClassAttendances(prev => prev.map(a => a.id === attendanceId ? { ...a, status } : a));
    const { error } = await supabase.from("attendances").update({ status }).eq("id", attendanceId);
    if (error) {
      alert("Error al actualizar asistencia: " + error.message);
      handleSelectClass(selectedClass); 
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      setClassesList(prev => prev.filter(c => c.id !== classId));
      const { error } = await supabase.from("classes").delete().eq("id", classId);
      if (error) throw new Error(error.message);
      alert("Clase y sus asistencias eliminadas con éxito.");
    } catch (err: any) {
      alert("Error al eliminar la clase: " + err.message);
      loadClasses();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold text-slate-900">Gestión de Clases</h2>
        {classMode !== "create" && (
          <button onClick={() => setClassMode("create")} className="text-xs font-semibold bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full flex items-center gap-1">
            <PlusCircle size={14}/> Programar Clase
          </button>
        )}
      </div>

      {classMode === "list" && (
        <div className="flex flex-col gap-3">
          {classesList.map(cls => (
            <div key={cls.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-purple-300 flex flex-col gap-3">
              <div className="flex justify-between items-center cursor-pointer" onClick={() => handleSelectClass(cls)}>
                <div>
                  <p className="font-bold text-slate-900">{cls.sublevel}</p>
                  <span className="text-xs text-slate-500">{new Date(cls.date + "T12:00:00").toLocaleDateString()}</span>
                </div>
                <div className="flex text-xs text-slate-500 gap-4">
                  <span className="flex items-center gap-1"><MapPin size={12}/> {cls.location}</span>
                  <span className="flex items-center gap-1"><Clock size={12}/> {cls.schedule}</span>
                </div>
              </div>
              <div className="flex justify-end border-t border-slate-100 pt-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm("¿Estás seguro de eliminar esta clase? Se borrarán los registros de asistencia asociados.")) {
                      handleDeleteClass(cls.id);
                    }
                  }} 
                  className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <XCircle size={14} /> Eliminar clase
                </button>
              </div>
            </div>
          ))}
          {classesList.length === 0 && <p className="text-sm text-slate-500 text-center mt-4">No hay clases programadas.</p>}
        </div>
      )}

      {classMode === "create" && (
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
            <button type="button" onClick={() => setClassMode("list")} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-semibold">Cancelar</button>
            <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-semibold shadow-neon-sm">Guardar y Notificar</button>
          </div>
        </form>
      )}

      {classMode === "attendance" && selectedClass && (
        <div className="flex flex-col gap-4">
          <button onClick={() => setClassMode("list")} className="text-xs text-purple-600 font-medium w-fit hover:underline">&larr; Volver a lista de clases</button>
          
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
            <p className="font-bold text-purple-900">{selectedClass.sublevel}</p>
            <p className="text-xs text-purple-700">{new Date(selectedClass.date + "T12:00:00").toLocaleDateString()} • {selectedClass.location}</p>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            {classAttendances.map((att: any) => (
              <div key={att.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
                <p className="text-sm font-medium text-slate-900">{att.profiles?.full_name || "Desconocido"}</p>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleMarkAttendance(att.id, "attended")}
                    className={`p-1.5 rounded-md transition-colors ${att.status === "attended" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}
                  >
                    <CheckCircle2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleMarkAttendance(att.id, "absent")}
                    className={`p-1.5 rounded-md transition-colors ${att.status === "absent" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"}`}
                  >
                    <XCircle size={16} />
                  </button>
                  <button 
                    onClick={() => handleMarkAttendance(att.id, "pending")}
                    className={`p-1.5 rounded-md transition-colors ${att.status === "pending" ? "bg-yellow-100 text-yellow-600" : "bg-slate-100 text-slate-400"}`}
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
  );
}
