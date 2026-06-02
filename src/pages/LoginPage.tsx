import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, Eye, EyeOff, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export function LoginPage() {
  const { signIn, role, loading: authLoading, profileReady } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleForgotPassword() {
    if (!email) {
      setError("Escribe tu email arriba y luego haz clic en '¿Olvidaste tu contraseña?'");
      return;
    }
    setResetLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setResetLoading(false);
    setResetSent(true);
  }

  useEffect(() => {
    if (!authLoading && profileReady && role) {
      navigate(role === "admin" ? "/admin/dashboard" : "/guest/dashboard", {
        replace: true,
      });
    }
  }, [authLoading, profileReady, role, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      const msg = error.toLowerCase();
      if (msg.includes("invalid") || msg.includes("credentials")) {
        setError("Credenciales incorrectas. Verifica tu email y contraseña.");
      } else if (msg.includes("email not confirmed")) {
        setError("Tu email no ha sido confirmado. Revisa tu bandeja de entrada.");
      } else {
        setError(error);
      }
      return;
    }
    // onAuthStateChange will set the role; redirect handled above on re-render
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8] p-4">
      {/* Decorative background */}
      <div
        aria-hidden
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#2D6A9F]/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#F0A030]/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <Card className="shadow-xl border-sand-200">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Iniciar sesión</CardTitle>
            <CardDescription className="text-center">
              Accede a tu panel con tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={14} className="mr-2 animate-spin" />
                    Entrando…
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>

              {resetSent ? (
                <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-center">
                  ✓ Email de recuperación enviado. Revisa tu bandeja.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="w-full text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5 py-1"
                >
                  {resetLoading
                    ? <><Loader2 size={11} className="animate-spin" /> Enviando…</>
                    : <><Mail size={11} /> ¿Olvidaste tu contraseña?</>
                  }
                </button>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-6 space-y-2">
          <Link
            to="/"
            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
          >
            ← Volver al inicio
          </Link>
          <p className="text-xs text-muted-foreground">
            ¿Problemas para acceder? Contacta al administrador.
          </p>
        </div>
      </div>
    </div>
  );
}
