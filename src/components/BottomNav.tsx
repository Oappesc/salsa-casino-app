"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListVideo, CreditCard, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Inicio" },
    { href: "/pensum", icon: ListVideo, label: "Pensum" },
    { href: "/payments", icon: CreditCard, label: "Pagos" },
    { href: "/profile", icon: User, label: "Perfil" },
  ];

  if (pathname === "/login" || pathname === "/register" || pathname === "/") return null;

  return (
    <nav className="fixed bottom-0 w-full max-w-md bg-white/90 backdrop-blur-md border-t border-slate-200 pb-safe z-40">
      <ul className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive ? "text-purple-600" : "text-slate-400 hover:text-slate-500"
                }`}
              >
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
