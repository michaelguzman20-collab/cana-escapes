import { Outlet } from "react-router-dom";
import { AdminNav } from "./AdminNav";
import { PropertyProvider } from "@/contexts/PropertyContext";

export function AdminLayout() {
  return (
    <PropertyProvider>
      <div className="flex min-h-screen bg-background">
        <AdminNav />
        {/* pt-24 covers mobile top header (~96px); pb-20 covers mobile bottom nav with scroll */}
        <main className="flex-1 overflow-x-hidden pt-24 pb-20 md:pt-0 md:pb-0">
          <Outlet />
        </main>
      </div>
    </PropertyProvider>
  );
}
