import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import type {
  BotConfig, Contacto, Conversacion,
  KnowledgeItem, KnowledgeItemInsert, KnowledgeItemUpdate,
  Faq, FaqInsert, FaqUpdate,
} from "@/types/database";

// ════════════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN DEL BOT (tabla config: clave/valor)
// ════════════════════════════════════════════════════════════════════════════
export function useBotConfig() {
  return useQuery<Record<string, string>>({
    queryKey: ["bot_config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("config").select("*");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data as BotConfig[]) map[row.clave] = row.valor;
      return map;
    },
  });
}

export function useSetBotConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clave, valor }: { clave: string; valor: string }) => {
      const { error } = await supabase
        .from("config")
        .update({ valor })
        .eq("clave", clave);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bot_config"] }),
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  CONTACTOS (lista de chats) — se refresca solo cada 5s
// ════════════════════════════════════════════════════════════════════════════
export function useContactos() {
  return useQuery<Contacto[]>({
    queryKey: ["bot_contactos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contactos")
        .select("*")
        .order("ultimo_contacto", { ascending: false });
      if (error) throw error;
      return data as Contacto[];
    },
    refetchInterval: 5000,
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  CONVERSACIÓN de un contacto — se refresca solo cada 4s
// ════════════════════════════════════════════════════════════════════════════
export function useConversacion(telefono: string | null) {
  return useQuery<Conversacion[]>({
    queryKey: ["bot_conversacion", telefono],
    enabled: !!telefono,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversaciones")
        .select("*")
        .eq("telefono", telefono!)
        .order("fecha", { ascending: true });
      if (error) throw error;
      return data as Conversacion[];
    },
    refetchInterval: 4000,
  });
}

// Activar/desactivar el "modo humano" de un contacto (bot deja de responderle)
export function useToggleModoHumano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ telefono, modo_humano }: { telefono: string; modo_humano: boolean }) => {
      const { error } = await supabase
        .from("contactos")
        .update({ modo_humano })
        .eq("telefono", telefono);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bot_contactos"] }),
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  BASE DE CONOCIMIENTO
// ════════════════════════════════════════════════════════════════════════════
export function useKnowledge() {
  return useQuery<KnowledgeItem[]>({
    queryKey: ["bot_kb"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("base_conocimiento")
        .select("*")
        .order("categoria");
      if (error) throw error;
      return data as KnowledgeItem[];
    },
  });
}

export function useSaveKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: KnowledgeItemInsert & { id?: number }) => {
      if (item.id) {
        const { id, ...rest } = item;
        const { error } = await supabase
          .from("base_conocimiento")
          .update(rest as KnowledgeItemUpdate)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("base_conocimiento").insert(item);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bot_kb"] });
      toast({ title: "Guardado", variant: "success" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("base_conocimiento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bot_kb"] });
      toast({ title: "Eliminado" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  FAQs
// ════════════════════════════════════════════════════════════════════════════
export function useFaqs() {
  return useQuery<Faq[]>({
    queryKey: ["bot_faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .order("categoria");
      if (error) throw error;
      return data as Faq[];
    },
  });
}

export function useSaveFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: FaqInsert & { id?: number }) => {
      if (item.id) {
        const { id, ...rest } = item;
        const { error } = await supabase
          .from("faqs")
          .update(rest as FaqUpdate)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("faqs").insert(item);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bot_faqs"] });
      toast({ title: "Guardado", variant: "success" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("faqs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bot_faqs"] });
      toast({ title: "Eliminado" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
