"use client";

import { useState, useEffect } from "react";
import { Lock, Unlock, PlayCircle, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

const sublevelsMap = {
  Básico: ["Básico I", "Básico II", "Básico III", "Básico IV", "Pase de Nivel"],
  Intermedio: ["Intermedio I", "Intermedio II", "Intermedio III", "Intermedio IV", "Pase Evaluativo"],
  Avanzado: ["Avanzado I", "Avanzado II", "Avanzado III", "Avanzado IV", "Avanzado V", "Avanzado VI", "Avanzado VII"],
};

const flatSublevels = [
  ...sublevelsMap.Básico,
  ...sublevelsMap.Intermedio,
  ...sublevelsMap.Avanzado
];

type LevelTab = "Básico" | "Intermedio" | "Avanzado";

// Mock de figuras (en el futuro esto debería venir de Supabase)
const initialFigures = [
  { id: 1, name: "Paso Básico", mainLevel: "Básico", sublevel: "Básico I", videoUrl: "#" },
  { id: 2, name: "Exhíbela", mainLevel: "Básico", sublevel: "Básico I", videoUrl: "#" },
  { id: 3, name: "Dile que no", mainLevel: "Básico", sublevel: "Básico I", videoUrl: "#" },
  { id: 4, name: "Enchufla", mainLevel: "Básico", sublevel: "Básico II", videoUrl: null },
  { id: 5, name: "Setenta", mainLevel: "Intermedio", sublevel: "Intermedio I", videoUrl: null },
];

export default function PensumPage() {
  const [activeTab, setActiveTab] = useState<LevelTab>("Básico");
  const [expandedSublevel, setExpandedSublevel] = useState<string | null>("Básico I");
  
  const [userSublevel, setUserSublevel] = useState("Básico I");
  const [userStatus, setUserStatus] = useState("Activo");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("sublevel, status")
          .eq("id", user.id)
          .single();
          
        if (profile) {
          setUserSublevel(profile.sublevel || "Básico I");
          setUserStatus(profile.status || "Activo");
          
          // Set initial active tab based on user sublevel
          if (sublevelsMap.Intermedio.includes(profile.sublevel)) {
            setActiveTab("Intermedio");
          } else if (sublevelsMap.Avanzado.includes(profile.sublevel)) {
            setActiveTab("Avanzado");
          }
          setExpandedSublevel(profile.sublevel || "Básico I");
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const toggleSublevel = (sublevel: string) => {
    setExpandedSublevel(expandedSublevel === sublevel ? null : sublevel);
  };

  const handleTabChange = (level: LevelTab) => {
    setActiveTab(level);
    setExpandedSublevel(sublevelsMap[level][0]);
  };

  const userSublevelIndex = flatSublevels.indexOf(userSublevel);

  return (
    <div className="flex flex-col min-h-screen px-6 pt-8 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Pensum de Figuras</h1>
        <p className="text-slate-500 text-sm mt-1">Aprende y practica tus vueltas</p>
      </header>
      
      {userStatus === "Inactivo" && !loading && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-6 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={20} />
            <h2 className="font-bold text-sm">Acceso Bloqueado</h2>
          </div>
          <p className="text-sm text-red-800">
            Tu cuenta está inactiva debido a mensualidades pendientes. Reporta tu pago para reactivar el acceso a los videos del pensum.
          </p>
          <Link href="/payments" className="bg-red-600 text-white text-center py-2.5 rounded-xl font-medium text-sm hover:bg-red-700 transition-colors">
            Reportar Pago
          </Link>
        </div>
      )}

      {/* Tabs Principales */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {(["Básico", "Intermedio", "Avanzado"] as LevelTab[]).map((level) => (
          <button
            key={level}
            onClick={() => handleTabChange(level)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === level
                ? "bg-purple-600 text-white shadow-neon-sm"
                : "bg-white text-slate-500 border border-slate-200"
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Accordion de Subniveles */}
      <div className="flex flex-col gap-3">
        {sublevelsMap[activeTab].map((sublevel) => {
          const isExpanded = expandedSublevel === sublevel;
          const sublevelFigures = initialFigures.filter((f) => f.sublevel === sublevel);
          
          const sublevelIndex = flatSublevels.indexOf(sublevel);
          const isSublevelUnlocked = userStatus === "Activo" && sublevelIndex <= userSublevelIndex;

          return (
            <div key={sublevel} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => toggleSublevel(sublevel)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{sublevel}</span>
                  {!isSublevelUnlocked && <Lock size={14} className="text-slate-400" />}
                </div>
                {isExpanded ? (
                  <ChevronUp className="text-slate-400" size={20} />
                ) : (
                  <ChevronDown className="text-slate-400" size={20} />
                )}
              </button>

              {isExpanded && (
                <div className="p-4 flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50">
                  {sublevelFigures.length > 0 ? (
                    sublevelFigures.map((figure) => {
                      const figureUnlocked = isSublevelUnlocked;
                      return (
                        <div
                          key={figure.id}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-opacity ${
                            figureUnlocked
                              ? "bg-white border-slate-200 shadow-sm"
                              : "bg-slate-100 border-slate-200 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-full ${figureUnlocked ? "bg-purple-100 text-purple-600" : "bg-slate-200 text-slate-400"}`}>
                              {figureUnlocked ? <Unlock size={18} /> : <Lock size={18} />}
                            </div>
                            <div>
                              <h3 className={`text-sm font-semibold ${figureUnlocked ? "text-slate-900" : "text-slate-400"}`}>
                                {figure.name}
                              </h3>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {figureUnlocked ? "Disponible para práctica" : "Bloqueado"}
                              </p>
                            </div>
                          </div>
                          
                          <button 
                            disabled={!figureUnlocked}
                            className={`p-2 transition-colors ${
                              figureUnlocked 
                                ? "text-purple-500 hover:text-purple-700" 
                                : "text-slate-300 cursor-not-allowed"
                            }`}
                          >
                            <PlayCircle size={22} />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-slate-400">Próximamente</p>
                      <p className="text-xs text-slate-400 mt-1">Aún no hay figuras en este módulo.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
