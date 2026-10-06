"use client";

import { useState, useEffect } from "react";
import { PlayCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

const sublevelsMap = {
  Básico: ["Básico I", "Básico II", "Básico III", "Básico IV", "Pase de Nivel"],
  Intermedio: ["Intermedio I", "Intermedio II", "Intermedio III", "Intermedio IV", "Pase Evaluativo"],
  Avanzado: ["Avanzado I", "Avanzado II", "Avanzado III", "Avanzado IV", "Avanzado V", "Avanzado VI", "Avanzado VII"],
};

type LevelTab = "Básico" | "Intermedio" | "Avanzado";

// Convertir links de YT a embed
const formatYoutubeEmbed = (url: string) => {
  if (!url) return "";
  let videoId = "";
  if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0];
  } else if (url.includes("youtube.com/shorts/")) {
    videoId = url.split("shorts/")[1]?.split("?")[0];
  } else if (url.includes("youtube.com/watch")) {
    videoId = new URL(url).searchParams.get("v") || "";
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
};

export default function PensumPublicoPage() {
  const [activeTab, setActiveTab] = useState<LevelTab>("Básico");
  const [expandedSublevel, setExpandedSublevel] = useState<string | null>("Básico I");
  const [loading, setLoading] = useState(true);
  const [figures, setFigures] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch dynamic syllabus directamente sin auth (requiere tabla pública)
      const { data: syllabusData, error } = await supabase
        .from("syllabus")
        .select("*")
        .order("order_index", { ascending: true });
        
      if (syllabusData) {
        setFigures(syllabusData);
      } else if (error) {
        console.error("Error fetching syllabus:", error);
      }
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const toggleSublevel = (sublevel: string) => {
    setExpandedSublevel(expandedSublevel === sublevel ? null : sublevel);
  };

  const handleTabChange = (level: LevelTab) => {
    setActiveTab(level);
    setExpandedSublevel(sublevelsMap[level][0]);
  };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-8 pb-12 bg-slate-50">
      <header className="mb-6 flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <Image 
          src="/logo-familia-rumbera.png" 
          alt="Logo Familia Rumbera" 
          width={56} 
          height={56} 
          className="rounded-full border border-slate-100 shadow-sm"
        />
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">Pénsum de Clases</h1>
          <p className="text-purple-600 font-medium text-sm mt-0.5">Familia Rumbera</p>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <>
          {/* Tabs Principales */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
            {(["Básico", "Intermedio", "Avanzado"] as LevelTab[]).map((level) => (
              <button
                key={level}
                onClick={() => handleTabChange(level)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === level
                    ? "bg-purple-600 text-white shadow-neon-sm"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
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
              const sublevelFigures = figures.filter((f) => f.sublevel === sublevel);

              return (
                <div key={sublevel} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleSublevel(sublevel)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-semibold text-slate-900">{sublevel}</span>
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
                          const hasVideo = !!figure.video_url;
                          return (
                            <div
                              key={figure.id}
                              className="p-3 rounded-xl border bg-white border-slate-200 shadow-sm flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-full bg-purple-100 text-purple-600">
                                  <PlayCircle size={18} />
                                </div>
                                <div>
                                  <h3 className="text-sm font-semibold text-slate-900">
                                    {figure.name}
                                  </h3>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    {hasVideo ? "Video disponible" : "Sin video por ahora"}
                                  </p>
                                </div>
                              </div>
                              
                              <button 
                                disabled={!hasVideo}
                                onClick={() => hasVideo && setSelectedVideo(figure.video_url)}
                                className={`p-2 transition-colors ${
                                  hasVideo
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
        </>
      )}

      {/* Modal de Video */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div 
            className="w-full max-w-sm bg-black rounded-2xl overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-12 right-0 text-white hover:text-slate-300 p-2"
            >
              <X size={28} />
            </button>
            <div className="aspect-[9/16] w-full relative bg-slate-900">
              <iframe 
                src={formatYoutubeEmbed(selectedVideo)} 
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
