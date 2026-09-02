"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShieldAlert } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      setLoading(false);
    };
    checkAdmin();
  }, [router]);

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
      {children}
    </div>
  );
}
