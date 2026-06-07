import { useState } from "react";
import {
  MessageCircle, BookOpen, HelpCircle, Settings2, Bot, User,
  Plus, Pencil, Trash2, Power, Sparkles, Zap, Send, Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useBotConfig, useSetBotConfig,
  useContactos, useConversacion, useToggleModoHumano,
  useKnowledge, useSaveKnowledge, useDeleteKnowledge,
  useFaqs, useSaveFaq, useDeleteFaq,
} from "@/hooks/useWhatsappBot";
import type { Contacto, KnowledgeItem, Faq } from "@/types/database";

type Tab = "chats" | "kb" | "faqs" | "ajustes";

const NAVY = "#0F2B4C";
const AMBER = "#F0A030";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "chats",   label: "Conversaciones",     icon: MessageCircle },
  { id: "kb",      label: "Base de Conocimiento", icon: BookOpen },
  { id: "faqs",    label: "FAQs",               icon: HelpCircle },
  { id: "ajustes", label: "Ajustes",            icon: Settings2 },
];

function fmtTime(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-DO", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ════════════════════════════════════════════════════════════════════════════
export function AdminWhatsapp() {
  const [tab, setTab] = useState<Tab>("chats");
  const { data: config = {} } = useBotConfig();
  const setConfig = useSetBotConfig();
  const botActivo = config["bot_activo"] === "true";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* ── Header con switch ON/OFF ──────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2" style={{ color: NAVY }}>
            <Bot size={26} style={{ color: AMBER }} />
            Bot de WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Respuestas automáticas para tus clientes, 24/7
          </p>
        </div>

        <div
          className={cn(
            "flex items-center gap-4 rounded-xl px-5 py-3 border-2 transition-colors shrink-0",
            botActivo ? "border-green-500 bg-green-50" : "border-gray-300 bg-gray-50"
          )}
        >
          <Power size={22} className={botActivo ? "text-green-600" : "text-gray-400"} />
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: NAVY }}>
              {botActivo ? "Bot ENCENDIDO" : "Bot APAGADO"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {botActivo ? "Respondiendo automáticamente" : "Respondes tú manualmente"}
            </p>
          </div>
          <Switch
            checked={botActivo}
            onCheckedChange={(v) =>
              setConfig.mutate({ clave: "bot_activo", valor: v ? "true" : "false" })
            }
          />
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors",
              tab === id
                ? "border-[#F0A030] text-[#0F2B4C]"
                : "border-transparent text-muted-foreground hover:text-[#0F2B4C]"
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === "chats" && <ChatsTab />}
      {tab === "kb" && <KnowledgeTab />}
      {tab === "faqs" && <FaqsTab />}
      {tab === "ajustes" && <SettingsTab config={config} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 1 — CONVERSACIONES
// ════════════════════════════════════════════════════════════════════════════
function ChatsTab() {
  const { data: contactos = [], isLoading } = useContactos();
  const [selected, setSelected] = useState<Contacto | null>(null);
  const [search, setSearch] = useState("");

  const filtered = contactos.filter(
    (c) =>
      (c.nombre ?? "").toLowerCase().includes(search.toLowerCase()) ||
      c.telefono.includes(search)
  );

  return (
    <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-260px)] min-h-[480px]">
      {/* Lista de contactos */}
      <Card className={cn("overflow-hidden flex flex-col", selected && "hidden md:flex")}>
        <div className="p-3 border-b">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contacto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {isLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle size={28} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-muted-foreground">Aún no hay conversaciones</p>
              <p className="text-xs text-muted-foreground mt-1">
                Aparecerán aquí cuando un cliente escriba
              </p>
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3",
                  selected?.id === c.id && "bg-amber-50"
                )}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: NAVY }}
                >
                  {(c.nombre ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: NAVY }}>
                    {c.nombre ?? "Desconocido"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">+{c.telefono}</p>
                </div>
                {c.modo_humano ? (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-[10px]">
                    <User size={10} className="mr-1" /> Tú
                  </Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">
                    <Bot size={10} className="mr-1" /> Bot
                  </Badge>
                )}
              </button>
            ))
          )}
        </div>
      </Card>

      {/* Chat */}
      {selected ? (
        <ChatView contacto={selected} onBack={() => setSelected(null)} />
      ) : (
        <Card className="hidden md:flex items-center justify-center">
          <div className="text-center">
            <MessageCircle size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-muted-foreground">
              Selecciona una conversación para verla
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function ChatView({ contacto, onBack }: { contacto: Contacto; onBack: () => void }) {
  const { data: msgs = [] } = useConversacion(contacto.telefono);
  const toggle = useToggleModoHumano();

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Cabecera del chat */}
      <div className="flex items-center gap-3 p-3 border-b bg-white">
        <Button variant="ghost" size="sm" className="md:hidden" onClick={onBack}>
          ←
        </Button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ background: NAVY }}
        >
          {(contacto.nombre ?? "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: NAVY }}>
            {contacto.nombre ?? "Desconocido"}
          </p>
          <p className="text-xs text-muted-foreground">+{contacto.telefono}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {contacto.modo_humano ? "Respondes tú" : "Responde el bot"}
          </span>
          <Switch
            checked={!contacto.modo_humano}
            onCheckedChange={(v) =>
              toggle.mutate({ telefono: contacto.telefono, modo_humano: !v })
            }
          />
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {msgs.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">Sin mensajes</p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className="space-y-2">
            {m.mensaje && (
              <div className="flex justify-start">
                <div className="max-w-[75%] bg-white rounded-2xl rounded-tl-sm px-3.5 py-2 shadow-sm">
                  <p className="text-sm whitespace-pre-wrap" style={{ color: NAVY }}>{m.mensaje}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{fmtTime(m.fecha)}</p>
                </div>
              </div>
            )}
            {m.respuesta && (
              <div className="flex justify-end">
                <div
                  className="max-w-[75%] rounded-2xl rounded-tr-sm px-3.5 py-2 shadow-sm text-white"
                  style={{ background: m.tipo === "humano" ? "#1A6FA8" : NAVY }}
                >
                  <p className="text-sm whitespace-pre-wrap">{m.respuesta}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] opacity-70">{fmtTime(m.fecha)}</span>
                    <span className="text-[10px] opacity-90 flex items-center gap-0.5">
                      {m.tipo === "humano" ? (
                        <><User size={9} /> Tú</>
                      ) : m.tipo === "faq" ? (
                        <><Zap size={9} /> FAQ</>
                      ) : (
                        <><Sparkles size={9} /> IA</>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t bg-white text-center">
        <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
          <Send size={11} />
          Para responder manualmente, escribe desde tu WhatsApp Business en el teléfono
        </p>
      </div>
    </Card>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 2 — BASE DE CONOCIMIENTO
// ════════════════════════════════════════════════════════════════════════════
function KnowledgeTab() {
  const { data: items = [], isLoading } = useKnowledge();
  const save = useSaveKnowledge();
  const del = useDeleteKnowledge();
  const [editing, setEditing] = useState<Partial<KnowledgeItem> | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Información que el bot usa para responder con precisión (precios, villas, políticas...).
        </p>
        <Button
          onClick={() => setEditing({ categoria: "", titulo: "", contenido: "", activo: true })}
          style={{ background: NAVY }}
        >
          <Plus size={16} className="mr-1" /> Agregar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Cargando...</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it) => (
            <Card key={it.id} className={cn(!it.activo && "opacity-50")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="secondary" className="text-[10px]">{it.categoria}</Badge>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(it)} className="text-gray-400 hover:text-[#0F2B4C]">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`¿Eliminar "${it.titulo}"?`)) del.mutate(it.id); }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: NAVY }}>{it.titulo}</h3>
                <p className="text-xs text-muted-foreground line-clamp-4 whitespace-pre-wrap">{it.contenido}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogo de edición */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar" : "Nueva"} información</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Categoría</Label>
                <Input
                  value={editing.categoria ?? ""}
                  placeholder="Ej: Villas, Precios, Políticas, Ubicación"
                  onChange={(e) => setEditing({ ...editing, categoria: e.target.value })}
                />
              </div>
              <div>
                <Label>Título</Label>
                <Input
                  value={editing.titulo ?? ""}
                  placeholder="Ej: Villa Coral - 4 habitaciones"
                  onChange={(e) => setEditing({ ...editing, titulo: e.target.value })}
                />
              </div>
              <div>
                <Label>Contenido</Label>
                <Textarea
                  rows={6}
                  value={editing.contenido ?? ""}
                  placeholder="Escribe aquí toda la info: precios por noche, capacidad, amenidades, etc."
                  onChange={(e) => setEditing({ ...editing, contenido: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.activo ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, activo: v })}
                />
                <Label className="!mt-0">Activo (el bot lo usa)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              style={{ background: NAVY }}
              onClick={async () => {
                if (!editing?.categoria || !editing?.titulo || !editing?.contenido) {
                  alert("Completa categoría, título y contenido");
                  return;
                }
                await save.mutateAsync({
                  id: editing.id,
                  categoria: editing.categoria,
                  titulo: editing.titulo,
                  contenido: editing.contenido,
                  activo: editing.activo ?? true,
                });
                setEditing(null);
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 3 — FAQs
// ════════════════════════════════════════════════════════════════════════════
function FaqsTab() {
  const { data: faqs = [], isLoading } = useFaqs();
  const save = useSaveFaq();
  const del = useDeleteFaq();
  const [editing, setEditing] = useState<Partial<Faq> | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Respuestas exactas para preguntas frecuentes. Si el mensaje contiene una palabra clave, el bot responde al instante (sin gastar IA).
        </p>
        <Button
          onClick={() => setEditing({ pregunta: "", keywords: "", respuesta: "", categoria: "General", activo: true })}
          style={{ background: NAVY }}
        >
          <Plus size={16} className="mr-1" /> Agregar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Cargando...</p>
      ) : (
        <div className="space-y-3">
          {faqs.map((f) => (
            <Card key={f.id} className={cn(!f.activo && "opacity-50")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-[10px]">{f.categoria}</Badge>
                      {(f.usos ?? 0) > 0 && (
                        <span className="text-[10px] text-muted-foreground">{f.usos} usos</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm" style={{ color: NAVY }}>{f.pregunta}</h3>
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{f.respuesta}</p>
                    {f.keywords && (
                      <p className="text-[10px] text-amber-700 mt-1.5">🔑 {f.keywords}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditing(f)} className="text-gray-400 hover:text-[#0F2B4C]">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm("¿Eliminar esta FAQ?")) del.mutate(f.id); }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar" : "Nueva"} FAQ</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Pregunta</Label>
                <Input
                  value={editing.pregunta ?? ""}
                  placeholder="¿Cuál es el horario de check-in?"
                  onChange={(e) => setEditing({ ...editing, pregunta: e.target.value })}
                />
              </div>
              <div>
                <Label>Palabras clave (separadas por coma)</Label>
                <Input
                  value={editing.keywords ?? ""}
                  placeholder="check-in, entrada, llegada, hora"
                  onChange={(e) => setEditing({ ...editing, keywords: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Si el mensaje del cliente contiene alguna, el bot responde esta FAQ directamente.
                </p>
              </div>
              <div>
                <Label>Respuesta</Label>
                <Textarea
                  rows={4}
                  value={editing.respuesta ?? ""}
                  onChange={(e) => setEditing({ ...editing, respuesta: e.target.value })}
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <Input
                  value={editing.categoria ?? ""}
                  onChange={(e) => setEditing({ ...editing, categoria: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.activo ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, activo: v })}
                />
                <Label className="!mt-0">Activa</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              style={{ background: NAVY }}
              onClick={async () => {
                if (!editing?.pregunta || !editing?.respuesta) {
                  alert("Completa pregunta y respuesta");
                  return;
                }
                await save.mutateAsync({
                  id: editing.id,
                  pregunta: editing.pregunta,
                  keywords: editing.keywords ?? "",
                  respuesta: editing.respuesta,
                  categoria: editing.categoria ?? "General",
                  activo: editing.activo ?? true,
                });
                setEditing(null);
              }}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  TAB 4 — AJUSTES
// ════════════════════════════════════════════════════════════════════════════
function SettingsTab({ config }: { config: Record<string, string> }) {
  const setConfig = useSetBotConfig();
  const [nombre, setNombre] = useState(config["bot_nombre"] ?? "");
  const [tono, setTono] = useState(config["bot_tono"] ?? "");

  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold" style={{ color: NAVY }}>Personalidad del bot</h3>
          <div>
            <Label>Nombre del asistente</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Asistente Virtual" />
          </div>
          <div>
            <Label>Tono de las respuestas</Label>
            <Input value={tono} onChange={(e) => setTono(e.target.value)} placeholder="amable y profesional" />
          </div>
          <Button
            style={{ background: NAVY }}
            onClick={() => {
              setConfig.mutate({ clave: "bot_nombre", valor: nombre });
              setConfig.mutate({ clave: "bot_tono", valor: tono });
            }}
          >
            Guardar cambios
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-2">
          <h3 className="font-semibold" style={{ color: NAVY }}>Conexión</h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Número conectado:</span>
            <span className="font-medium">+1 809-210-2773</span>
          </div>
          <p className="text-xs text-muted-foreground">
            El bot responde en español e inglés automáticamente, según el idioma del cliente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
