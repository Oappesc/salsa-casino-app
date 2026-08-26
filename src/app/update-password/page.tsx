"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-12 justify-center bg-slate-50">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Nueva Contraseña</h1>
        <p className="text-slate-500">Ingresa tu nueva contraseña para acceder a tu cuenta.</p>
      </div>

      <form onSubmit={handleUpdate} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium border border-emerald-200 flex flex-col gap-2">
            <p>¡Contraseña actualizada con éxito!</p>
            <p className="font-normal text-emerald-600">Redirigiendo a tu perfil...</p>
            <Link href="/dashboard" className="mt-2 text-emerald-800 underline font-semibold">Ir al Dashboard manualmente</Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || password.length < 6}
              className="bg-purple-600 text-white font-bold py-3.5 rounded-xl mt-4 shadow-neon-sm hover:shadow-neon transition-all active:scale-95 disabled:opacity-70 disabled:shadow-none"
            >
              {loading ? "Actualizando..." : "Actualizar Contraseña"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
