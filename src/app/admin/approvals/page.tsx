"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, XCircle } from "lucide-react";

export default function AdminApprovalsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentTab, setPaymentTab] = useState<"pending" | "history">("pending");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "verified" | "rejected">("all");

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    const { data } = await supabase
      .from("payments")
      .select("*, profiles(full_name, phone)")
      .order("created_at", { ascending: false });
    if (data) setPayments(data);
  };

  const formatWhatsappNumber = (phone: string) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, ""); 
    if (cleaned.startsWith("0")) {
      cleaned = "58" + cleaned.slice(1);
    } else if (!cleaned.startsWith("58")) {
      cleaned = "58" + cleaned;
    }
    return cleaned;
  };

  const handleUpdatePayment = async (paymentId: string, status: "verified" | "rejected", phone: string, studentName: string, concept: string) => {
    const safeConcept = concept || "Mensualidad";
    const safeStudentName = studentName || "Estudiante";

    try {
      const { error } = await supabase
        .from("payments")
        .update({ status })
        .eq("id", paymentId)
        .select();

      if (error) throw new Error(`RLS o permisos: ${error.message}`);

      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status } : p));

      if (phone) {
        let msg = "";
        if (status === "verified") {
          msg = `¡Hola ${safeStudentName}!\n\nTu pago por el concepto de *${safeConcept}* ha sido *Validado* exitosamente.\n\n¡Gracias por formar parte de la Familia Rumbera!`;
        } else if (status === "rejected") {
          msg = `¡Hola ${safeStudentName}!\n\nHubo un inconveniente con la verificación de tu pago por el concepto de *${safeConcept}*. Por favor, revisa tu comprobante o contáctanos para aclarar la situación.\n\nAtentamente, Familia Rumbera.`;
        }
        const formattedPhone = formatWhatsappNumber(phone);
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, "_blank");
      }
    } catch (err: any) {
      alert("⚠️ No se pudo actualizar el pago.\n\nDetalle: " + err.message);
      loadPayments();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-semibold text-slate-900 mb-2">Validación de Pagos</h2>
      
      <div className="flex gap-2 p-1 bg-slate-200 rounded-lg">
        <button onClick={() => setPaymentTab("pending")} className={`flex-1 py-1.5 text-sm font-medium rounded-md ${paymentTab === "pending" ? "bg-white shadow-sm text-purple-600" : "text-slate-500"}`}>
          Pendientes
        </button>
        <button onClick={() => setPaymentTab("history")} className={`flex-1 py-1.5 text-sm font-medium rounded-md ${paymentTab === "history" ? "bg-white shadow-sm text-purple-600" : "text-slate-500"}`}>
          Historial
        </button>
      </div>

      {paymentTab === "history" && (
        <select 
          value={paymentFilter} 
          onChange={(e: any) => setPaymentFilter(e.target.value)}
          className="bg-white border border-slate-200 text-sm p-2 rounded-lg"
        >
          <option value="all">Todos</option>
          <option value="verified">Solo Aprobados</option>
          <option value="rejected">Solo Rechazados</option>
        </select>
      )}

      <div className="flex flex-col gap-3">
        {payments
          .filter(p => {
            if (paymentTab === "pending") return p.status === "pending";
            if (paymentFilter === "all") return p.status !== "pending";
            return p.status === paymentFilter;
          })
          .map(payment => (
            <div key={payment.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-900">{payment.profiles?.full_name || "Desconocido"}</p>
                  <p className="text-sm text-slate-500">{payment.concept}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{new Date(payment.created_at).toLocaleString("es-ES")}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                  payment.status === "verified" ? "bg-emerald-100 text-emerald-700" : 
                  payment.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {payment.status.toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between text-sm items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                <p><strong>Monto:</strong> ${(Number(payment.amount_usd ?? payment.amount) || 0).toFixed(2)} USD</p>
                <p><strong>Ref:</strong> {payment.reference || "Efectivo"}</p>
              </div>

              {payment.receipt_url && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={payment.receipt_url} alt="Comprobante de pago" className="w-full max-h-80 object-contain" />
                </div>
              )}

              {payment.status === "pending" && (
                <div className="flex gap-2 mt-1">
                  <button onClick={() => handleUpdatePayment(payment.id, "verified", payment.profiles?.phone, payment.profiles?.full_name, payment.concept)} className="flex-1 bg-emerald-50 text-emerald-600 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                    <CheckCircle2 size={16} /> Aprobar
                  </button>
                  <button onClick={() => handleUpdatePayment(payment.id, "rejected", payment.profiles?.phone, payment.profiles?.full_name, payment.concept)} className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 border border-red-200 hover:bg-red-100 transition-colors">
                    <XCircle size={16} /> Rechazar
                  </button>
                </div>
              )}
            </div>
        ))}
      </div>
    </div>
  );
}
