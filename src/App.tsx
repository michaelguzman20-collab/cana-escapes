import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SplashScreen } from "@/components/cana/SplashScreen";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { GuestLayout } from "@/components/layout/GuestLayout";
import { LoginPage } from "@/pages/LoginPage";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AdminCalendario } from "@/pages/admin/AdminCalendario";
import { AdminReservas } from "@/pages/admin/AdminReservas";
import { AdminConfiguracion } from "@/pages/admin/AdminConfiguracion";
import { AdminHuespedes } from "@/pages/admin/AdminHuespedes";
import { AdminPlataformas } from "@/pages/admin/AdminPlataformas";
import { AdminPropietarios } from "@/pages/admin/AdminPropietarios";
import { AdminCargos } from "@/pages/admin/AdminCargos";
import { AdminCanaEscapes } from "@/pages/admin/AdminCanaEscapes";
import { AdminContabilidad } from "@/pages/admin/AdminContabilidad";
import { AdminCalculadora } from "@/pages/admin/AdminCalculadora";
import { AdminMantenimiento } from "@/pages/admin/AdminMantenimiento";
import { AdminPagosPropietarios } from "@/pages/admin/AdminPagosPropietarios";
import { AdminWhatsapp } from "@/pages/admin/AdminWhatsapp";
import { GuestDashboard } from "@/pages/guest/GuestDashboard";
import { ShareView } from "@/pages/share/ShareView";
import { UpdatePassword } from "@/pages/UpdatePassword";
import { Toaster } from "@/components/ui/toaster";
import { supabaseConfigured } from "@/lib/supabase";
import { HomePage } from "@/pages/HomePage";
import { PropietariosPage } from "@/pages/PropietariosPage";
import { ServiciosPage } from "@/pages/ServiciosPage";
import { Logo } from "@/components/layout/Logo";

function SetupScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sand-50 via-background to-sand-100 p-6">
      <div className="max-w-lg w-full space-y-6 animate-fade-in">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="bg-card border border-amber-200 rounded-xl p-6 shadow-lg space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="font-serif font-semibold text-lg">Configuración requerida</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Falta el archivo <code className="bg-muted px-1 rounded text-xs">.env</code> con las credenciales de Supabase.
              </p>
            </div>
          </div>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              <span>Copia <code className="bg-muted px-1 rounded text-xs">.env.example</code> y renómbralo a <code className="bg-muted px-1 rounded text-xs">.env</code></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
              <span>Abre <strong>Supabase → Settings → API</strong> y copia tu <em>Project URL</em> y <em>anon key</em></span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <p>Pega los valores en el <code className="bg-muted px-1 rounded text-xs">.env</code>:</p>
                <pre className="mt-2 bg-muted rounded p-3 text-xs overflow-auto">
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}
                </pre>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</span>
              <span>Reinicia el servidor: <code className="bg-muted px-1 rounded text-xs">npm run dev</code></span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  if (!supabaseConfigured) return <SetupScreen />;

  // Intro splash only on a fresh load of the public landing page ("/").
  // App mounts once, so in-app route changes never re-trigger it, and
  // admin/login loads skip it entirely.
  const [showSplash, setShowSplash] = useState(
    () => typeof window !== "undefined" && window.location.pathname === "/"
  );

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          <Route path="/compartir/:token" element={<ShareView />} />

          {/* Admin routes */}
          <Route element={<RequireAuth role="admin" />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard"     element={<AdminDashboard />}    />
              <Route path="/admin/huespedes"     element={<AdminHuespedes />}    />
              <Route path="/admin/reservas"      element={<AdminReservas />}     />
              <Route path="/admin/calendario"    element={<AdminCalendario />}   />
              <Route path="/admin/plataformas"   element={<AdminPlataformas />}  />
              <Route path="/admin/mantenimiento" element={<AdminMantenimiento />} />
              <Route path="/admin/propietarios"  element={<AdminPropietarios />} />
              <Route path="/admin/cargos"        element={<AdminCargos />} />
              <Route path="/admin/pagos-propietarios" element={<AdminPagosPropietarios />} />
              <Route path="/admin/cana-escapes" element={<AdminCanaEscapes />} />
              <Route path="/admin/calculadora" element={<AdminCalculadora />} />
              <Route path="/admin/contabilidad" element={<AdminContabilidad />} />
              <Route path="/admin/whatsapp" element={<AdminWhatsapp />} />
              <Route path="/admin/configuracion" element={<AdminConfiguracion />} />
            </Route>
          </Route>

          {/* Guest routes */}
          <Route element={<RequireAuth role="guest" />}>
            <Route element={<GuestLayout />}>
              <Route
                path="/guest/dashboard"
                element={<GuestDashboard />}
              />
            </Route>
          </Route>

          {/* Dev preview: admin can view guest portal */}
          {import.meta.env.VITE_DEV_ADMIN === "true" && (
            <Route element={<RequireAuth role="admin" />}>
              <Route element={<GuestLayout />}>
                <Route path="/dev/portal" element={<GuestDashboard />} />
              </Route>
            </Route>
          )}

          {/* Landing pages */}
          <Route path="/" element={<HomePage />} />
          <Route path="/propietarios" element={<PropietariosPage />} />
          <Route path="/servicios" element={<ServiciosPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
