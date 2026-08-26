"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Provide the redirect URL for after they click the email link
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen px-6 py-12 justify-center bg-slate-50">
      <div className="mb-6">
        <Link href="/login" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Volver a Iniciar Sesión
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Recuperar Contraseña</h1>
        <p className="text-slate-500">Ingresa tu correo para recibir un enlace de recuperación.</p>
      </div>

      <form onSubmit={handleReset} className="flex flex-col gap-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium border border-emerald-200 flex flex-col gap-2">
            <p>¡Correo enviado con éxito!</p>
            <p className="font-normal text-emerald-600">Revisa tu bandeja de entrada y sigue las instrucciones para crear una nueva contraseña.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                placeholder="tu@correo.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-purple-600 text-white font-bold py-3.5 rounded-xl mt-4 shadow-neon-sm hover:shadow-neon transition-all active:scale-95 disabled:opacity-70 disabled:shadow-none"
            >
              {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
