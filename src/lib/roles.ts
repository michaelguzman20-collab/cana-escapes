import type { UserRole } from "@/types/database";

// Página de inicio de cada tipo de cuenta después de entrar
export function homeForRole(role: UserRole | null | undefined) {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "track_admin": // administrador de equipo de Cana Track
      return "/track";
    case "guest":
      return "/guest/dashboard";
    default: // usuarios de la app Cana Track no tienen portal web
      return "/";
  }
}
