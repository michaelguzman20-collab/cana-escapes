import { lazy, Suspense, useState, type ComponentType } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SplashScreen } from "@/components/cana/SplashScreen";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { GuestLayout } from "@/components/layout/GuestLayout";
import { LoginPage } from "@/pages/LoginPage";
import { Toaster } from "@/components/ui/toaster";
import { supabaseConfigured } from "@/lib/supabase";
import { VisitTracker } from "@/lib/visits";
import { HomePage } from "@/pages/HomePage";
import { Logo } from "@/components/layout/Logo";

// Páginas que se descargan solo al abrirlas (paneles y páginas públicas secundarias): así cada página
// —por ejemplo un tour 360 abierto desde WhatsApp— carga mucho menos código en el teléfono.
function lazyPage<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(() => load().then((m) => ({ default: m[name] })));
}
const AdminDashboard = lazyPage(() => import("@/pages/admin/AdminDashboard"), "AdminDashboard");
const AdminCalendario = lazyPage(() => import("@/pages/admin/AdminCalendario"), "AdminCalendario");
const AdminReservas = lazyPage(() => import("@/pages/admin/AdminReservas"), "AdminReservas");
const AdminConfiguracion = lazyPage(() => import("@/pages/admin/AdminConfiguracion"), "AdminConfiguracion");
const AdminHuespedes = lazyPage(() => import("@/pages/admin/AdminHuespedes"), "AdminHuespedes");
const AdminPlataformas = lazyPage(() => import("@/pages/admin/AdminPlataformas"), "AdminPlataformas");
const AdminPropietarios = lazyPage(() => import("@/pages/admin/AdminPropietarios"), "AdminPropietarios");
const AdminCargos = lazyPage(() => import("@/pages/admin/AdminCargos"), "AdminCargos");
const AdminCanaEscapes = lazyPage(() => import("@/pages/admin/AdminCanaEscapes"), "AdminCanaEscapes");
const AdminContabilidad = lazyPage(() => import("@/pages/admin/AdminContabilidad"), "AdminContabilidad");
const AdminCalculadora = lazyPage(() => import("@/pages/admin/AdminCalculadora"), "AdminCalculadora");
const AdminMantenimiento = lazyPage(() => import("@/pages/admin/AdminMantenimiento"), "AdminMantenimiento");
const AdminPagosPropietarios = lazyPage(() => import("@/pages/admin/AdminPagosPropietarios"), "AdminPagosPropietarios");
const AdminWhatsapp = lazyPage(() => import("@/pages/admin/AdminWhatsapp"), "AdminWhatsapp");
const AdminTrack = lazyPage(() => import("@/pages/admin/AdminTrack"), "AdminTrack");
const AdminCanaDna = lazyPage(() => import("@/pages/admin/AdminCanaDna"), "AdminCanaDna");
const AdminTours = lazyPage(() => import("@/pages/admin/AdminTours"), "AdminTours");
const AdminTourIntakes = lazyPage(() => import("@/pages/admin/AdminTourIntakes"), "AdminTourIntakes");
const AdminTourDemos = lazyPage(() => import("@/pages/admin/AdminTourDemos"), "AdminTourDemos");
const AdminVisitas = lazyPage(() => import("@/pages/admin/AdminVisitas"), "AdminVisitas");
const TrackTeamPage = lazyPage(() => import("@/pages/TrackTeamPage"), "TrackTeamPage");
const GuestDashboard = lazyPage(() => import("@/pages/guest/GuestDashboard"), "GuestDashboard");
const ShareView = lazyPage(() => import("@/pages/share/ShareView"), "ShareView");
const UpdatePassword = lazyPage(() => import("@/pages/UpdatePassword"), "UpdatePassword");
const PropietariosPage = lazyPage(() => import("@/pages/PropietariosPage"), "PropietariosPage");
const ServiciosPage = lazyPage(() => import("@/pages/ServiciosPage"), "ServiciosPage");
const AppsPage = lazyPage(() => import("@/pages/AppsPage"), "AppsPage");
const CanaDnaPage = lazyPage(() => import("@/pages/CanaDnaPage"), "CanaDnaPage");
const ToursPage = lazyPage(() => import("@/pages/ToursPage"), "ToursPage");
const TourPage = lazyPage(() => import("@/pages/TourPage"), "TourPage");
const AppGuidePage = lazyPage(() => import("@/pages/AppGuidePage"), "AppGuidePage");
const AppPrivacyPage = lazyPage(() => import("@/pages/AppPrivacyPage"), "AppPrivacyPage");
const TrackDeleteAccountPage = lazyPage(() => import("@/pages/TrackDeleteAccountPage"), "TrackDeleteAccountPage");

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#F0A030] border-t-transparent animate-spin" />
    </div>
  );
}

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
      <VisitTracker />
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
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
              <Route path="/admin/track" element={<AdminTrack />} />
              <Route path="/admin/cana-dna" element={<AdminCanaDna />} />
              <Route path="/admin/tours" element={<AdminTours />} />
              <Route path="/admin/tours/fichas" element={<AdminTourIntakes />} />
              <Route path="/admin/tours/agenda" element={<AdminTourDemos />} />
              <Route path="/admin/visitas" element={<AdminVisitas />} />
              <Route path="/admin/configuracion" element={<AdminConfiguracion />} />
            </Route>
          </Route>

          {/* Cana Track: administradores de equipo */}
          <Route element={<RequireAuth role="track_admin" />}>
            <Route path="/track" element={<TrackTeamPage />} />
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
          <Route path="/apps" element={<AppsPage />} />
          <Route path="/cana-dna" element={<CanaDnaPage />} />
          <Route path="/tours" element={<ToursPage />} />
          <Route path="/tour/:slug" element={<TourPage />} />
          <Route path="/apps/:slug/guia" element={<AppGuidePage />} />
          <Route path="/apps/:slug/privacidad" element={<AppPrivacyPage />} />
          <Route path="/apps/cana-track/borrar-cuenta" element={<TrackDeleteAccountPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
