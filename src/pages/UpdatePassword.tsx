import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase sends the recovery token in the URL hash.
  // onAuthStateChange with PASSWORD_RECOVERY event validates it and
  // sets a temporary session so updateUser() works.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await supabase.from("admin_notifications").insert({
          type: "password_reset",
          title: "Contraseña restablecida",
          message: `El propietario ${user.email} restableció su contraseña.`,
          user_email: user.email,
        });
      }
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#eef3f9] via-[#f0f6ff] to-[#e8f0f8] p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <Card className="shadow-xl border-sand-200">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center flex items-center justify-center gap-2">
              <KeyRound size={18} />
              Nueva contraseña
            </CardTitle>
            <CardDescription className="text-center">
              Escribe tu nueva contraseña para acceder
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                <p className="font-medium">¡Contraseña actualizada!</p>
                <p className="text-sm text-muted-foreground">Redirigiendo al login…</p>
              </div>
            ) : !ready ? (
              <div className="py-6 text-center space-y-3">
                <Loader2 size={28} className="mx-auto animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Validando enlace de recuperación…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar contraseña</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Repite la contraseña"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <><Loader2 size={14} className="mr-2 animate-spin" />Guardando…</>
                  ) : (
                    "Actualizar contraseña"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
