"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Save, LogOut, Lock, Info, CheckCircle2, XCircle } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");

  const [currentLevel, setCurrentLevel] = useState("Básico I");
  const [studentStatus, setStudentStatus] = useState<"Activo" | "Inactivo">("Activo");

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setEmail(user.email || "");
      setFullName(user.user_metadata?.full_name || "");
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile) {
        setPhone(profile.phone || "");
        setBirthday(profile.birthday || "");
        if (profile.sublevel) setCurrentLevel(profile.sublevel);
        if (profile.status) setStudentStatus(profile.status);
      }
      setLoading(false);
    };
    loadProfile();
  }, [router]);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.auth.updateUser({ data: { full_name: fullName } });
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone, birthday: birthday || null, updated_at: new Date().toISOString() }).eq("id", user.id);
    setSaving(false);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/login"); };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-slate-400">Cargando perfil...</p></div>;

  return (
    <div className="flex flex-col min-h-screen px-6 pt-8 pb-24 gap-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
        <p className="text-slate-500 text-sm mt-1">Gestiona tu información personal</p>
      </header>

      {/* Datos Personales */}
      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-purple-600 uppercase tracking-wider">Datos Personales</h2>
        
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">Nombre Completo</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm" placeholder="Tu nombre" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">Correo Electrónico</label>
          <input type="email" value={email} disabled className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-400 cursor-not-allowed" />
          <p className="text-[10px] text-slate-400">El correo no puede ser modificado desde aquí.</p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">Teléfono</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm" placeholder="Ej. 04241234567" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700">Fecha de Cumpleaños</label>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm" />
        </div>

        <button onClick={handleSave} disabled={saving} className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3.5 rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-neon">
          {saved ? (<><CheckCircle2 size={18} /> Cambios Guardados</>) : (<><Save size={18} /> {saving ? "Guardando..." : "Guardar Cambios"}</>)}
        </button>
      </section>

      <hr className="border-slate-200" />

      {/* Información de la Academia */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-purple-600 uppercase tracking-wider">Información de la Academia</h2>
          <Lock size={14} className="text-slate-400" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Nivel Actual</p>
            <p className="font-semibold text-sm text-slate-900">{currentLevel}</p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Estado</p>
            {studentStatus === "Activo" ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 size={14} /> Activo</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500"><XCircle size={14} /> Inactivo</span>
            )}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex items-start gap-3">
          <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-500 leading-relaxed">
            El estado del alumno pasa a <strong className="text-slate-700">"Inactivo"</strong> automáticamente al acumular 2 mensualidades vencidas. Contacta a la administración para más información.
          </p>
        </div>
      </section>

      <hr className="border-slate-200" />

      <button onClick={handleSignOut} className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-semibold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2">
        <LogOut size={18} />
        Cerrar Sesión
      </button>
    </div>
  );
}
