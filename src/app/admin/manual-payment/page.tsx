"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, UploadCloud, DollarSign } from "lucide-react";
import { MONTHLY_FEE } from "@/lib/constants";

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function AdminManualPaymentPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [amount, setAmount] = useState(MONTHLY_FEE.toString());
  const [reference, setReference] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, sublevel")
      .eq("role", "student")
      .order("full_name", { ascending: true });
    if (data) setStudents(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      alert("Por favor selecciona un alumno.");
      return;
    }
    
    setLoading(true);
    try {
      let receipt_url = null;
      if (receiptFile) {
        const fileExt = receiptFile.name.split(".").pop();
        const fileName = `${selectedStudentId}-${Date.now()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from("payment_receipts")
          .upload(fileName, receiptFile);
        
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from("payment_receipts").getPublicUrl(fileName);
        receipt_url = publicUrlData.publicUrl;
      }

      const concept = `Mensualidad de ${MONTH_NAMES[selectedMonth]}`;

      const { error } = await supabase.from("payments").insert({
        user_id: selectedStudentId,
        amount: parseFloat(amount),
        reference: reference || null,
        concept: concept,
        receipt_url,
        status: "verified" // Manual payments by admin are verified by default
      });

      if (error) throw error;

      alert("Pago registrado y aprobado exitosamente.");
      setSelectedStudentId("");
      setReference("");
      setReceiptFile(null);
    } catch (err: any) {
      alert("Error al registrar el pago: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-semibold text-slate-900 mb-2">Cargar Pago Manual</h2>
      
      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Alumno</label>
          <select 
            value={selectedStudentId} 
            onChange={e => setSelectedStudentId(e.target.value)} 
            className="border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none" 
            required
          >
            <option value="">Selecciona un alumno...</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.full_name} ({s.sublevel})</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Concepto (Mes a pagar)</label>
          <select 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(Number(e.target.value))} 
            className="border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i}>Mensualidad de {m}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Monto (USD)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="number" 
                step="0.01"
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none" 
                required 
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-500">Referencia (Opcional)</label>
            <input 
              type="text" 
              value={reference} 
              onChange={e => setReference(e.target.value)} 
              className="border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-purple-500 outline-none" 
              placeholder="Ej: Efectivo, Zelle..." 
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Comprobante (Opcional)</label>
          <label className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-2 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
            <UploadCloud className="text-slate-400" size={32} />
            <span className="text-sm font-medium text-slate-600 text-center">
              {receiptFile ? receiptFile.name : "Sube el comprobante"}
            </span>
            <span className="text-xs text-slate-400">JPG, PNG o PDF</span>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*,.pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setReceiptFile(e.target.files[0]);
                }
              }} 
            />
          </label>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold shadow-neon-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
        >
          {loading ? "Registrando..." : <><CheckCircle2 size={18} /> Registrar Pago Verificado</>}
        </button>

      </form>
    </div>
  );
}
