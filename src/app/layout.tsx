import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Familia Rumbera",
  description: "PWA para gestión de academia de Salsa Casino",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-familia-rumbera.png",
    apple: "/logo-familia-rumbera.png",
  },
};

export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen pb-16`} suppressHydrationWarning>
        <main className="max-w-md mx-auto min-h-screen bg-slate-50 relative overflow-x-hidden">
          {children}
          <BottomNav />
        </main>
      </body>
    </html>
  );
}
