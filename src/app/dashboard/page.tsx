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
  const [scheduleInfo, setScheduleInfo] = useState("Cargando...");
  const [accountStatus, setAccountStatus] = useState("Activo");
  
  const [attendances, setAttendances] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [nextPaymentDate, setNextPaymentDate] = useState<string>("Cargando...");

  const MONTH_NAMES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

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

        // Fetch last payment
        const { data: payData } = await supabase
          .from("payments")
          .select("concept, created_at")
          .eq("user_id", user.id)
          .eq("status", "verified")
          .order("created_at", { ascending: false })
          .limit(1);

        if (payData && payData.length > 0) {
          const concept = payData[0].concept || "";
          const matchedMonthIdx = MONTH_NAMES.findIndex(m => concept.includes(m));
          if (matchedMonthIdx !== -1) {
            setNextPaymentDate(`5 de ${MONTH_NAMES[(matchedMonthIdx + 1) % 12]}`);
          } else {
            const lastDate = new Date(payData[0].created_at);
            setNextPaymentDate(`5 de ${MONTH_NAMES[(lastDate.getMonth() + 1) % 12]}`);
          }
        } else {
          setNextPaymentDate(`5 de ${MONTH_NAMES[new Date().getMonth()]}`);
        }

        // Fetch attendances with classes
        const { data: attData } = await supabase
          .from("attendances")
          .select("id, status, date, class_id, classes(date, schedule, location)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        
        if (attData) {
          setAttendances(attData);
        }
      }
      setLoading(false);
    };
    getUserData();
  }, []);

  useEffect(() => {
    // Calculate percentage based on selected month
    const monthAttendances = attendances.filter(a => {
      const dateStr = a.classes?.date || a.date;
      return new Date(dateStr + 'T00:00:00').getMonth() === selectedMonth;
    });

    const now = new Date();
    now.setHours(0,0,0,0);
    const pastClasses = monthAttendances.filter(a => {
      const dateStr = a.classes?.date || a.date;
      const d = new Date(dateStr + 'T00:00:00');
      return d <= now;
    });

    if (pastClasses.length === 0) {
      setAttendancePercentage("N/A");
    } else {
      const attendedCount = pastClasses.filter(a => a.status === 'attended').length;
      setAttendancePercentage(`${Math.round((attendedCount / pastClasses.length) * 100)}%`);
    }
  }, [attendances, selectedMonth]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'attended': return <span className="flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-200"><CheckCircle2 size={12}/> Asistió</span>;
      case 'absent': return <span className="flex items-center gap-1 text-xs font-medium bg-red-50 text-red-500 px-2.5 py-1 rounded-full border border-red-200"><XCircle size={12}/> Faltó</span>;
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
            <p className="font-semibold text-sm text-slate-900">$10</p>
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
              ? `Tu próximo pago es el ${nextPaymentDate}.`
              : "Tienes mensualidades pendientes por pagar."}
          </p>
        </div>
      </div>

      {/* Clases Recientes */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Historial de Clases</h2>
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2"
          >
            {MONTH_NAMES.map((month, idx) => (
              <option key={month} value={idx}>{month}</option>
            ))}
          </select>
        </div>
        
        <div className="flex flex-col gap-3">
          {attendances.filter(a => new Date((a.classes?.date || a.date) + 'T00:00:00').getMonth() === selectedMonth).length > 0 ? (
            attendances
              .filter(a => new Date((a.classes?.date || a.date) + 'T00:00:00').getMonth() === selectedMonth)
              .map((att) => {
                const dateStr = att.classes?.date || att.date;
                const dateObj = new Date(dateStr + 'T12:00:00');
                const locStr = att.classes?.location || "Clase Regular";
                
                return (
                  <div key={att.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-medium text-slate-900">{locStr}</p>
                      <p className="text-xs text-slate-500">
                        {dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                        {att.classes?.schedule ? ` • ${att.classes.schedule}` : ''}
                      </p>
                    </div>
                    {getStatusBadge(att.status)}
                  </div>
                );
            })
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center shadow-sm">
              <p className="text-sm text-slate-500">No hay clases registradas en este mes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
