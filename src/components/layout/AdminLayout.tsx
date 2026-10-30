import { Suspense, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { AdminNav } from "./AdminNav";
import { PropertyProvider } from "@/contexts/PropertyContext";
import { markInternalVisitor } from "@/lib/visits";

export function AdminLayout() {
  // Este navegador es del equipo: sus visitas al sitio y a los tours no cuentan en Visitas
  useEffect(markInternalVisitor, []);
  return (
    <PropertyProvider>
      <div className="flex min-h-screen bg-background">
        <AdminNav />
        {/* pt-24 covers mobile top header (~96px); pb-20 covers mobile bottom nav with scroll; md:ml-64 = menú lateral fijo */}
        <main className="flex-1 min-w-0 overflow-x-hidden pt-24 pb-20 md:pt-0 md:pb-0 md:ml-64">
          {/* Cada página se descarga al abrirla: el menú queda visible mientras tanto */}
          <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[#F0A030] border-t-transparent animate-spin" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </PropertyProvider>
  );
}
