import { AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";
import type { GuideBlock } from "@/content/appGuides";

// Bloque de contenido de las guías y políticas de las apps (/apps/<slug>/guia y /privacidad)
export function GuideBlockView({ block, l }: { block: GuideBlock; l: "es" | "en" }) {
  switch (block.type) {
    case "p":
      return <p className="text-[#0F2B4C]/75 leading-relaxed">{block.text[l]}</p>;
    case "steps":
      return (
        <ol className="space-y-3">
          {block.items[l].map((item, i) => (
            <li key={i} className="flex gap-3 text-[#0F2B4C]/80 leading-relaxed break-inside-avoid">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#0F2B4C] text-[#F0A030] text-sm font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      );
    case "list":
      return (
        <ul className="space-y-2.5">
          {block.items[l].map((item, i) => (
            <li key={i} className="flex gap-2.5 text-[#0F2B4C]/80 leading-relaxed break-inside-avoid">
              <CheckCircle2 size={17} className="text-[#F0A030] flex-shrink-0 mt-1" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case "tip":
    case "warn": {
      const warn = block.type === "warn";
      const Icon = warn ? AlertTriangle : Lightbulb;
      return (
        <div
          className={`flex gap-3 rounded-2xl p-4 text-sm leading-relaxed break-inside-avoid ${
            warn ? "bg-[#FDECEC] text-[#8a2626]" : "bg-[#F0A030]/15 text-[#6b4510]"
          }`}
        >
          <Icon size={18} className="flex-shrink-0 mt-0.5" />
          <span>{block.text[l]}</span>
        </div>
      );
    }
    case "faq":
      return (
        <dl className="divide-y divide-[#0F2B4C]/10">
          {block.items.map((item, i) => (
            <div key={i} className="py-3.5 first:pt-0 last:pb-0 break-inside-avoid">
              <dt className="font-semibold text-[#0F2B4C]">{item.q[l]}</dt>
              <dd className="mt-1 text-[#0F2B4C]/70 leading-relaxed">{item.a[l]}</dd>
            </div>
          ))}
        </dl>
      );
  }
}
