"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Activity, CheckCircle2, DollarSign, MapPin, AlertCircle, Crown, Info, XCircle, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function DashboardPage() {
  const [userName, setUserName] = useState<string>("Rumbero");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(true);

  const [currentLevel, setCurrentLevel] = useState("Cargando...");
  const [attendancePercentage, setAttendancePercentage] = useState("100%");
  const [monthlyFee, setMonthlyFee] = useState("$10");
  const [scheduleInfo, setScheduleInfo] = useState("Cargando...");
  const [accountStatus, setAccountStatus] = useState("Activo");
  
  const [attendances, setAttendances] = useState<any[]>([]);

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || "Rumbero");
        setEmailConfirmed(!!user.email_confirmed_at);
        
        // Fetch profile
        const { data: profile } = await supabase
          .from("profiles")
          .select(`
            sublevel,
            status,
            role,
            groups (
              schedule,
              locations (
                name
              )
            )
          `)
          .eq("id", user.id)
          .single();
          
        if (profile) {
          setCurrentLevel(profile.sublevel || "Básico I");
          setAccountStatus(profile.status || "Activo");
          if (profile.role === 'admin') setIsAdmin(true);
          
          if (profile.groups) {
            const group = profile.groups as any;
            const locName = group.locations?.name || "La Sabana";
            const sched = group.schedule || "18:30 - 20:00 hrs";
            setScheduleInfo(`${locName} - ${sched}`);
          } else {
            setScheduleInfo("La Sabana - 18:30 - 20:00 hrs");
          }
        }

        // Fetch attendances
        const { data: attData } = await supabase
          .from("attendances")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(5);
        
        if (attData) {
          setAttendances(attData);
        }
      }
      setLoading(false);
    };
    getUserData();
  }, []);

  const getNextPaymentDate = () => {
    const today = new Date();
    let targetMonth = today.getMonth();
    if (today.getDate() > 5) {
      targetMonth = (targetMonth + 1) % 12;
    }
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `5 de ${monthNames[targetMonth]}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'attended': return <span className="flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-200"><CheckCircle2 size={12}/> Asistió</span>;
      case 'absent': return <span className="flex items-center gap-1 text-xs font-medium bg-red-50 text-red-500 px-2.5 py-1 rounded-full border border-red-200"><XCircle size={12}/> No asistió</span>;
      default: return <span className="flex items-center gap-1 text-xs font-medium bg-yellow-50 text-yellow-600 px-2.5 py-1 rounded-full border border-yellow-200"><Clock size={12}/> Pendiente</span>;
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-8 pb-24 gap-6">
      <header className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-sm font-bold text-purple-600 mb-1 uppercase tracking-wider">Familia Rumbera</h1>
          <h2 className="text-2xl font-bold text-slate-900 truncate max-w-[200px]">
            Hola, {loading ? "..." : userName.split(" ")[0]}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link href="/admin" className="bg-amber-100 text-amber-600 p-2.5 rounded-full shadow-sm hover:bg-amber-200 transition-colors">
              <Crown size={20} />
            </Link>
          )}
          <div className="rounded-full shadow-neon-sm overflow-hidden border-2 border-purple-100 flex items-center justify-center bg-white w-12 h-12 shrink-0">
            <Image 
              src="/logo-familia-rumbera.png" 
              alt="Avatar Familia Rumbera" 
              width={48} 
              height={48} 
              className="object-cover"
            />
          </div>
        </div>
      </header>

      {!emailConfirmed && !loading && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-3 shadow-sm">
          <Info className="shrink-0 mt-0.5 text-amber-500" size={18} />
          <p className="text-xs text-amber-800 leading-tight">
            ⚠️ Recuerda verificar tu correo electrónico para asegurar la recuperación de tu cuenta.
          </p>
        </div>
      )}

      {/* Grid de 4 Bloques Informativos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 shadow-sm">
          <Activity className="text-purple-500" size={20} />
          <div>
            <p className="text-xs text-slate-500">Nivel Actual</p>
            <p className="font-semibold text-sm text-slate-900 line-clamp-1">{currentLevel}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 shadow-sm">
          <CheckCircle2 className="text-emerald-500" size={20} />
          <div>
            <p className="text-xs text-slate-500">Asistencia</p>
            <p className="font-semibold text-sm text-slate-900">{attendancePercentage}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 shadow-sm">
          <DollarSign className="text-purple-500" size={20} />
          <div>
            <p className="text-xs text-slate-500">Mensualidad</p>
            <p className="font-semibold text-sm text-slate-900">{monthlyFee}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-2 shadow-sm">
          <MapPin className="text-purple-500" size={20} />
          <div>
            <p className="text-xs text-slate-500">Sede y Horario</p>
            <p className="font-semibold text-sm text-slate-900 leading-tight">{scheduleInfo}</p>
          </div>
        </div>
      </div>

      {/* Estado de Cuenta */}
      <div className={`border p-4 rounded-2xl flex items-start gap-3 mt-2 ${
        accountStatus === "Activo" 
          ? "bg-purple-50 border-purple-200" 
          : "bg-red-50 border-red-200"
      }`}>
        <AlertCircle className={`shrink-0 mt-0.5 ${accountStatus === "Activo" ? "text-purple-500" : "text-red-500"}`} size={20} />
        <div>
          <h3 className={`font-medium ${accountStatus === "Activo" ? "text-purple-900" : "text-red-900"}`}>
            Estado de la cuenta: {accountStatus}
          </h3>
          <p className={`text-sm mt-1 ${accountStatus === "Activo" ? "text-purple-700/70" : "text-red-700/70"}`}>
            {accountStatus === "Activo" 
              ? `Tu próximo pago es el ${getNextPaymentDate()}.`
              : "Tienes mensualidades pendientes por pagar."}
          </p>
        </div>
      </div>

      {/* Clases Recientes */}
      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-4 text-slate-900">Clases Recientes</h2>
        <div className="flex flex-col gap-3">
          {attendances.length > 0 ? (
            attendances.map((att) => (
              <div key={att.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                <div>
                  <p className="font-medium text-slate-900">Clase Regular</p>
                  <p className="text-xs text-slate-500">
                    {new Date(att.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </p>
                </div>
                {getStatusBadge(att.status)}
              </div>
            ))
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm text-slate-500">No tienes clases registradas aún.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
