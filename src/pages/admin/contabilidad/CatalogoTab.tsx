import { useMemo, useState } from "react";
import { Plus, ChevronRight, ChevronDown, Search, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useChartOfAccounts, useCreateAccount, useUpdateAccount } from "@/hooks/useFiscal";
import type { ChartAccount } from "@/types/fiscal";

const TIPOS_CUENTA = ["Activo", "Pasivo", "Capital", "Ingreso", "Costo", "Gasto"] as const;
const TIPO_COLORS: Record<string, string> = {
  Activo: "bg-blue-100 text-blue-700",
  Pasivo: "bg-red-100 text-red-700",
  Capital: "bg-purple-100 text-purple-700",
  Ingreso: "bg-green-100 text-green-700",
  Costo: "bg-orange-100 text-orange-700",
  Gasto: "bg-amber-100 text-amber-700",
};

export function CatalogoTab() {
  const { data: accounts = [] } = useChartOfAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const [search, setSearch] = useState("");
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(TIPOS_CUENTA));
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ codigo: "", nombre: "", tipo: "Activo", naturaleza: "Debito", nivel: 4, cuenta_padre: "", acepta_movimientos: true, descripcion: "" });

  const filtered = useMemo(() => {
    if (!search) return accounts;
    const s = search.toLowerCase();
    return accounts.filter((a) => a.codigo.toLowerCase().includes(s) || a.nombre.toLowerCase().includes(s));
  }, [accounts, search]);

  const grouped = useMemo(() => {
    const map: Record<string, ChartAccount[]> = {};
    for (const t of TIPOS_CUENTA) map[t] = [];
    for (const a of filtered) {
      if (map[a.tipo]) map[a.tipo].push(a);
    }
    return map;
  }, [filtered]);

  function toggleType(t: string) {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  async function handleAdd() {
    if (!form.codigo || !form.nombre) {
      toast({ title: "Código y nombre son requeridos", variant: "destructive" });
      return;
    }
    try {
      await createAccount.mutateAsync({
        codigo: form.codigo,
        nombre: form.nombre,
        tipo: form.tipo,
        naturaleza: form.naturaleza,
        nivel: form.nivel,
        cuenta_padre: form.cuenta_padre || null,
        acepta_movimientos: form.acepta_movimientos,
        descripcion: form.descripcion || null,
        activa: true,
      });
      toast({ title: `Cuenta ${form.codigo} creada` });
      setShowAdd(false);
      setForm({ codigo: "", nombre: "", tipo: "Activo", naturaleza: "Debito", nivel: 4, cuenta_padre: "", acepta_movimientos: true, descripcion: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  async function handleToggleActive(a: ChartAccount) {
    try {
      await updateAccount.mutateAsync({ id: a.id, activa: !a.activa });
      toast({ title: `Cuenta ${a.codigo} ${a.activa ? "desactivada" : "activada"}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter((a) => a.activa).length;
  const movableAccounts = accounts.filter((a) => a.acepta_movimientos && a.activa).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-[#0F2B4C]">{totalAccounts}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Total Cuentas</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{activeAccounts}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Activas</p>
        </div>
        <div className="bg-white rounded-xl border p-3 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-600">{movableAccounts}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Con Movimientos</p>
        </div>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2B4C]/20"
            placeholder="Buscar por código o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={14} /> Nueva Cuenta
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-[#0F2B4C] uppercase">Nueva Cuenta Contable</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Código *</label>
              <input className="w-full px-2 py-1.5 text-sm border rounded-lg" placeholder="ej: 1.1.05.01" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Nombre *</label>
              <input className="w-full px-2 py-1.5 text-sm border rounded-lg" placeholder="Nombre de la cuenta" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Tipo</label>
              <select className="w-full px-2 py-1.5 text-sm border rounded-lg" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS_CUENTA.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Naturaleza</label>
              <select className="w-full px-2 py-1.5 text-sm border rounded-lg" value={form.naturaleza} onChange={(e) => setForm({ ...form, naturaleza: e.target.value })}>
                <option>Debito</option>
                <option>Credito</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Cuenta Padre</label>
              <select className="w-full px-2 py-1.5 text-sm border rounded-lg" value={form.cuenta_padre} onChange={(e) => setForm({ ...form, cuenta_padre: e.target.value })}>
                <option value="">— Sin padre —</option>
                {accounts.filter((a) => !a.acepta_movimientos).map((a) => (
                  <option key={a.codigo} value={a.codigo}>{a.codigo} - {a.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase">Nivel</label>
              <input type="number" className="w-full px-2 py-1.5 text-sm border rounded-lg" min={1} max={5} value={form.nivel} onChange={(e) => setForm({ ...form, nivel: +e.target.value })} />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" checked={form.acepta_movimientos} onChange={(e) => setForm({ ...form, acepta_movimientos: e.target.checked })} />
                Acepta movimientos
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={createAccount.isPending} className="gap-1">
              <Check size={14} /> Guardar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>
              <X size={14} /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Account tree grouped by tipo */}
      {TIPOS_CUENTA.map((tipo) => {
        const items = grouped[tipo] || [];
        if (items.length === 0 && search) return null;
        const isExpanded = expandedTypes.has(tipo);

        return (
          <div key={tipo} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              onClick={() => toggleType(tipo)}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TIPO_COLORS[tipo]}`}>{tipo}</span>
                <span className="text-sm font-semibold text-[#0F2B4C]">
                  {tipo === "Activo" ? "1xxx" : tipo === "Pasivo" ? "2xxx" : tipo === "Capital" ? "3xxx" : tipo === "Ingreso" ? "4xxx" : tipo === "Costo" ? "5xxx" : "6xxx"} — {tipo}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{items.length} cuentas</span>
            </button>
            {isExpanded && items.length > 0 && (
              <div className="border-t">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] uppercase text-muted-foreground">
                      <th className="text-left px-4 py-2 font-semibold">Código</th>
                      <th className="text-left px-4 py-2 font-semibold">Nombre</th>
                      <th className="text-center px-4 py-2 font-semibold">Naturaleza</th>
                      <th className="text-center px-4 py-2 font-semibold">Movimientos</th>
                      <th className="text-center px-4 py-2 font-semibold">Estado</th>
                      <th className="text-right px-4 py-2 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a) => (
                      <tr key={a.id} className={`border-t hover:bg-gray-50/50 ${!a.activa ? "opacity-50" : ""}`}>
                        <td className="px-4 py-2">
                          <span className="font-mono font-semibold text-[#0F2B4C]" style={{ paddingLeft: `${(a.nivel - 1) * 12}px` }}>
                            {a.codigo}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={a.acepta_movimientos ? "" : "font-semibold text-[#0F2B4C]"}>
                            {a.nombre}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`text-[10px] font-bold ${a.naturaleza === "Debito" ? "text-blue-600" : "text-red-600"}`}>
                            {a.naturaleza === "Debito" ? "DB" : "CR"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {a.acepta_movimientos ? (
                            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                          ) : (
                            <span className="inline-block w-2 h-2 rounded-full bg-gray-300" />
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`text-[10px] font-semibold ${a.activa ? "text-green-600" : "text-gray-400"}`}>
                            {a.activa ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            className="text-muted-foreground hover:text-[#0F2B4C] p-1"
                            onClick={() => handleToggleActive(a)}
                            title={a.activa ? "Desactivar" : "Activar"}
                          >
                            <Pencil size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
