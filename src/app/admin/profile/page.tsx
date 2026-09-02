"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogOut, User, Mail, ShieldCheck } from "lucide-react";

export default function AdminProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile({ ...data, email: user.email });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-semibold text-slate-900">Perfil de Administrador</h2>
      
      {profile ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-purple-600 p-6 flex flex-col items-center justify-center text-white">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm mb-3">
              <ShieldCheck size={40} className="text-white" />
            </div>
            <h3 className="font-bold text-xl">{profile.full_name || "Admin"}</h3>
            <p className="text-purple-200 text-sm">{profile.role.toUpperCase()}</p>
          </div>
          
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-lg">
                <User className="text-slate-500" size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Nombre</p>
                <p className="text-sm text-slate-900 font-medium">{profile.full_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-lg">
                <Mail className="text-slate-500" size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase">Correo Electrónico</p>
                <p className="text-sm text-slate-900 font-medium">{profile.email}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-slate-500">Cargando perfil...</p>
      )}

      <button 
        onClick={handleLogout}
        className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 border border-red-100 hover:bg-red-100 transition-colors"
      >
        <LogOut size={20} /> Cerrar Sesión
      </button>
    </div>
  );
}
