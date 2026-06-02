import { supabase } from "./supabase";

export type AccessAction = "login" | "logout" | "page_visit";

export async function logAccess(entry: {
  user_id: string | null;
  user_email: string;
  user_role?: string | null;
  action: AccessAction;
  page?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await supabase.from("access_logs").insert({
      user_id:    entry.user_id,
      user_email: entry.user_email,
      user_role:  entry.user_role ?? null,
      action:     entry.action,
      page:       entry.page ?? null,
      metadata:   entry.metadata ?? null,
    } as never);
  } catch {
    // Silent — never break the app if logging fails
  }
}
