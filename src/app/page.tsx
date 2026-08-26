import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen px-6 py-12 items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="bg-purple-100 p-2 rounded-full mb-8 shadow-neon-sm overflow-hidden flex items-center justify-center w-28 h-28 border-4 border-white">
        <Image 
          src="/logo-familia-rumbera.png" 
          alt="Logo Familia Rumbera" 
          width={112} 
          height={112} 
          className="object-contain"
        />
      </div>
      
      <h1 className="text-4xl font-bold text-center mb-2 text-slate-900">Familia Rumbera</h1>
      <p className="text-purple-600 font-medium text-sm mb-2">Academia de Salsa Casino</p>
      <p className="text-slate-500 text-center mb-12 max-w-sm">
        Gestiona tu aprendizaje, asistencia y pagos en la academia de forma sencilla.
      </p>

      <div className="flex flex-col w-full gap-4 max-w-sm">
        <Link 
          href="/login"
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-2xl transition-colors text-center shadow-neon"
        >
          Iniciar Sesión
        </Link>
        
        <Link 
          href="/register"
          className="bg-white hover:bg-slate-50 text-slate-900 font-semibold py-4 rounded-2xl transition-colors text-center border border-slate-200 shadow-sm"
        >
          Crear Cuenta
        </Link>
      </div>
    </div>
  );
}
