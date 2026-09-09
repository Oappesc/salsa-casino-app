"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Phone, Lock, Mail } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  
  // Modos de login: student | admin
  const [mode, setMode] = useState<"student" | "admin">("student");

  // Form states
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 6) {
      setError("Por favor ingresa un número de teléfono válido.");
      setLoading(false);
      return;
    }

    const syntheticEmail = `${cleanPhone}@salsacasino.com`;
    const syntheticPassword = cleanPhone;

    const { error: signInError } = await supabase.auth.signInWithPassword({ 
      email: syntheticEmail, 
      password: syntheticPassword 
    });

    if (signInError) {
      if (signInError.message.toLowerCase().includes("invalid login credentials")) {
        setError("Número telefónico no registrado. Consulta con la administración de la academia.");
      } else {
        setError(signInError.message);
      }
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Opcional: Validar si es admin antes de redirigir
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profile?.role === 'admin') {
      router.push("/admin/classes");
    } else {
      // Si no es admin, cerramos sesión y mostramos error
      await supabase.auth.signOut();
      setError("No tienes permisos de administrador.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-12 bg-slate-50">
      <div className="flex-1 flex flex-col justify-center items-center">
        <div className="mb-8 text-center flex flex-col items-center">
          <Image 
            src="/logo-familia-rumbera.png" 
            alt="Logo Familia Rumbera" 
            width={120} 
            height={120} 
            className="mb-4"
          />
          <h1 className="text-3xl font-bold mb-2 text-slate-900">
            {mode === "student" ? "Acceso Estudiantes" : "Acceso Administrativo"}
          </h1>
          <p className="text-slate-500">
            {mode === "student" ? "Ingresa con tu número de teléfono" : "Inicia sesión en el panel"}
          </p>
        </div>

        {mode === "student" ? (
          <form onSubmit={handleStudentLogin} className="flex flex-col gap-5 w-full max-w-sm">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">
                {error}
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Número de Teléfono</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Phone size={20} />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                  placeholder="Ej: 04241234567"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-2xl transition-colors disabled:opacity-50 shadow-neon"
            >
              {loading ? "Validando..." : "Ingresar a mi Perfil"}
            </button>
            
            <p className="mt-6 text-center text-slate-500 text-sm">
              ¿Eres Administrador?{" "}
              <button 
                type="button"
                onClick={() => { setMode("admin"); setError(null); }}
                className="text-purple-600 font-medium hover:underline"
              >
                Ingresa aquí
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleAdminLogin} className="flex flex-col gap-5 w-full max-w-sm">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">
                {error}
              </div>
            )}
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                  placeholder="admin@salsacasino.com"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Contraseña</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={20} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-12 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-4 rounded-2xl transition-colors disabled:opacity-50"
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
            
            <p className="mt-6 text-center text-slate-500 text-sm">
              ¿Eres Estudiante?{" "}
              <button 
                type="button"
                onClick={() => { setMode("student"); setError(null); }}
                className="text-purple-600 font-medium hover:underline"
              >
                Vuelve al Acceso de Estudiantes
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
