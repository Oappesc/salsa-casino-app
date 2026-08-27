"use client";

import { useState, useEffect } from "react";
import { Upload, Send, Receipt, Copy, CheckCircle2, X, Clock, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BANK_DETAILS, MONTHLY_FEE } from "@/lib/constants";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

type Payment = {
  id?: string;
  status: string;
  concept?: string;
  created_at: string;
  amount_usd?: number;
  payment_method?: string;
  receipt_url?: string;
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'verified': return <span className="flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full border border-emerald-200"><CheckCircle2 size={12}/> Validado</span>;
    case 'rejected': return <span className="flex items-center gap-1 text-[10px] font-medium bg-red-50 text-red-500 px-2 py-1 rounded-full border border-red-200"><XCircle size={12}/> Rechazado</span>;
    default: return <span className="flex items-center gap-1 text-[10px] font-medium bg-yellow-50 text-yellow-600 px-2 py-1 rounded-full border border-yellow-200"><Clock size={12}/> Pendiente</span>;
  }
}

export default function PaymentsPage() {
  const [paymentMethod, setPaymentMethod] = useState<"pago_movil" | "usd_cash">("pago_movil");
  const [file, setFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Estudiante");
  const [userId, setUserId] = useState<string | null>(null);
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [nextMonthToPay, setNextMonthToPay] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const adminPhone = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || "584241520043"; 

  const calculateNextMonth = (history: Payment[]) => {
    const verifiedPayments = history.filter(p => p.status === 'verified');
    
    if (verifiedPayments.length === 0) { 
      setNextMonthToPay(MONTH_NAMES[new Date().getMonth()]);
      return;
    }
    
    const lastPayment = verifiedPayments[0];
    const concept = lastPayment.concept || "";
    const matchedMonthIdx = MONTH_NAMES.findIndex(m => concept.includes(m));
    
    if (matchedMonthIdx !== -1) {
      setNextMonthToPay(MONTH_NAMES[(matchedMonthIdx + 1) % 12]);
    } else {
      const lastDate = new Date(lastPayment.created_at);
      setNextMonthToPay(MONTH_NAMES[(lastDate.getMonth() + 1) % 12]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserName(user.user_metadata?.full_name || "Estudiante");
        const { data: history } = await supabase
          .from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (history) { setPayments(history); calculateNextMonth(history); }
        else { calculateNextMonth([]); }
      }
    };
    fetchData();
  }, []);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { alert("Debes adjuntar el comprobante o foto del dinero."); return; }
    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file);
      if (uploadError) throw new Error("Error subiendo el archivo: " + uploadError.message);
      const { data: publicUrlData } = supabase.storage.from('receipts').getPublicUrl(fileName);
      const receiptUrl = publicUrlData.publicUrl;
      const conceptStr = `Mensualidad ${nextMonthToPay}`;

      let newPayment = null;
      if (userId) {
        const { data, error: dbError } = await supabase.from('payments').insert({
          user_id: userId, amount_usd: MONTHLY_FEE,
          payment_method: paymentMethod,
          receipt_url: receiptUrl, status: 'pending'
        }).select().single();
        if (dbError) throw new Error("Error guardando el pago: " + dbError.message);
        newPayment = data;
      }
      if (newPayment) { const updated = [newPayment, ...payments]; setPayments(updated); calculateNextMonth(updated); }

      const methodLabel = paymentMethod === "pago_movil" ? "Pago Móvil" : "USD Efectivo";
      const text = `Hola, soy ${userName}. Acabo de reportar un pago.%0A%0A*Concepto:* ${conceptStr}%0A*Método:* ${methodLabel}%0A*Monto:* $${MONTHLY_FEE}%0A*Comprobante:* ${receiptUrl}`;
      window.open(`https://wa.me/${adminPhone}?text=${text}`, "_blank");
      setFile(null);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Hubo un error al procesar el pago.");
    }
    finally { setLoading(false); }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const diffDays = Math.ceil(Math.abs(new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24)); 
    if (diffDays === 1) return "Hoy";
    if (diffDays === 2) return "Ayer";
    if (diffDays <= 30) return `Hace ${diffDays - 1} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex flex-col min-h-screen px-6 pt-8 pb-24 relative">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reportar Pago</h1>
        <p className="text-slate-500 text-sm mt-1">Registra y valida tus mensualidades</p>
      </header>

      {/* Tabs de Método */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
        <button onClick={() => setPaymentMethod("pago_movil")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${paymentMethod === "pago_movil" ? "bg-purple-600 text-white shadow-neon-sm" : "text-slate-500"}`}>Pago Móvil</button>
        <button onClick={() => setPaymentMethod("usd_cash")} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${paymentMethod === "usd_cash" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500"}`}>USD Efectivo</button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Aviso del Mes */}
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-purple-600">Reportando pago para:</p>
            <p className="font-semibold text-purple-900">Mensualidad {nextMonthToPay || "..."}</p>
          </div>
          <Receipt className="text-purple-400 opacity-50" size={24} />
        </div>

        {/* Datos Bancarios */}
        {paymentMethod === "pago_movil" && (
          <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3 shadow-sm">
            <h3 className="text-sm font-semibold text-purple-600 mb-1">Datos Bancarios</h3>
            {([
              { label: "Banco", value: BANK_DETAILS.bank, key: "bank" },
              { label: "Cédula", value: BANK_DETAILS.id, key: "id" },
              { label: "Teléfono", value: BANK_DETAILS.phone, key: "phone" },
            ] as const).map((item) => (
              <div key={item.key} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">{item.label}</p>
                  <p className="font-medium text-sm text-slate-900">{item.value}</p>
                </div>
                <button type="button" onClick={() => handleCopy(item.value, item.key)} className="text-slate-400 hover:text-purple-600 p-1">
                  {copiedField === item.key ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Carga de Archivo */}
        <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-colors relative">
          <div className="bg-purple-100 p-3 rounded-full mb-2">
            <Upload className="text-purple-600" size={24} />
          </div>
          <p className="font-medium text-sm text-slate-900">
            {file ? file.name : (paymentMethod === "pago_movil" ? "Subir captura del comprobante" : "Subir foto del dinero")}
          </p>
          <p className="text-xs text-slate-400">JPG, PNG o PDF (Max. 5MB)</p>
          <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>

        <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-center">
          <p className="text-xs text-purple-600">Mensualidad fija</p>
          <p className="text-xl font-bold text-purple-900">${MONTHLY_FEE} USD</p>
        </div>

        <button type="submit" disabled={loading || !file} className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-2xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-neon">
          <Send size={20} />
          {loading ? "Procesando..." : "Enviar por WhatsApp"}
        </button>
      </form>

      {/* Historial Colapsable */}
      <div className="mt-12">
        <button onClick={() => setHistoryOpen(!historyOpen)} className="w-full bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between transition-colors shadow-sm">
          <div className="flex items-center gap-2">
            <Receipt size={20} className="text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">Historial de Pagos</h2>
            {payments.length > 0 && <span className="text-[10px] font-medium bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{payments.length}</span>}
          </div>
          {historyOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>
        {historyOpen && (
          <div className="flex flex-col gap-3 mt-3">
            {payments.length > 0 ? payments.map((payment) => (
              <div key={payment.id} onClick={() => setSelectedPayment(payment)} className="bg-white hover:bg-slate-50 cursor-pointer transition-colors rounded-xl p-4 flex justify-between items-center border border-slate-200 shadow-sm">
                <div>
                  <p className="font-medium text-sm text-slate-900">{payment.concept || "Mensualidad"}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{formatDate(payment.created_at)}</p>
                </div>
                <StatusBadge status={payment.status} />
              </div>
            )) : (
              <div className="text-center py-8 bg-white rounded-xl border border-slate-200">
                <p className="text-sm text-slate-400">Aún no tienes historial de pagos registrados.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh] shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Detalle de Pago</h3>
              <button onClick={() => setSelectedPayment(null)} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-5 overflow-y-auto flex flex-col gap-5">
              <div className="flex justify-between items-start">
                <div><p className="text-xs text-slate-400 mb-1">Concepto</p><p className="font-medium text-slate-900">{selectedPayment.concept || "Mensualidad"}</p></div>
                <StatusBadge status={selectedPayment.status} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-slate-400 mb-1">Monto</p><p className="font-semibold text-purple-600">${selectedPayment.amount_usd ?? MONTHLY_FEE} USD</p></div>
                <div><p className="text-xs text-slate-400 mb-1">Método</p><p className="font-medium text-sm text-slate-900">{selectedPayment.payment_method === 'usd_cash' ? 'USD Efectivo' : 'Pago Móvil'}</p></div>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-2">Comprobante / Foto</p>
                {selectedPayment.receipt_url ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={selectedPayment.receipt_url} 
                      alt="Comprobante de pago" 
                      className="w-full h-auto max-h-64 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = '<p class="text-sm text-red-400 p-4 text-center">Error al cargar la imagen. El archivo no existe o fue eliminado.</p>';
                      }}
                    />
                  </div>
                ) : <p className="text-sm text-slate-400">No hay imagen disponible</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
