// Utilidades compartidas por el visor público y el editor de Tours 360: escape de HTML y el logo
// del suelo (nadir). Los addons están en tourAddons.ts.

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// ── Logo en el suelo (nadir) para tapar el trípode ──────────────────────────
// Círculo azul con el ícono de Tours 360 y "TOURS 360°": tapa el trípode y a la vez promociona el
// servicio a quien vea el tour (sin el nombre de Cana Escapes: los tours son también de otros clientes).

// Ícono "rotate-3d" de lucide (viewBox 24), el de "Tours 360" en el menú
const ROTATE_3D = [
  "M16.466 7.5C15.643 4.237 13.952 2 12 2 9.239 2 7 6.477 7 12s2.239 10 5 10c.342 0 .677-.069 1-.2",
  "m15.194 13.707 3.814 1.86-1.86 3.814",
  "M19 15.57c-1.804.885-4.274 1.43-7 1.43-5.523 0-10-2.239-10-5s4.477-5 10-5c4.838 0 8.873 1.718 9.8 4",
];

/** Ícono 360 (naranja) para la pantalla de carga: gira dentro del círculo de Tours 360 (tours.css) */
export const LOADER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#F0A030" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ROTATE_3D.map((d) => `<path d="${d}"/>`).join("")}</svg>`
  );

let nadirLogo: Promise<string> | null = null;

export function nadirLogoUrl() {
  nadirLogo ??= Promise.resolve().then(() => {
    const S = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const ctx = c.getContext("2d")!;
    // Fondo y aro
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2);
    ctx.fillStyle = "#0F2B4C";
    ctx.fill();
    ctx.lineWidth = 16;
    ctx.strokeStyle = "#F0A030";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 40, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(240,160,48,0.45)";
    ctx.stroke();
    // Ícono 360
    const icon = 400;
    ctx.save();
    ctx.translate(S / 2 - icon / 2, 190);
    ctx.scale(icon / 24, icon / 24);
    ctx.strokeStyle = "#F0A030";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ROTATE_3D.forEach((d) => ctx.stroke(new Path2D(d)));
    ctx.restore();
    // Texto
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 104px system-ui, 'Segoe UI', Arial, sans-serif";
    ctx.fillText("TOURS 360°", S / 2, 760);
    return c.toDataURL("image/png");
  });
  return nadirLogo;
}

/** Marcador 3D plano en el suelo; `size` = grados desde el punto más bajo hasta la esquina */
export function nadirMarker(url: string, sizeDeg: number, opacityPct = 100) {
  const pitch = -(90 - sizeDeg) * (Math.PI / 180);
  const q = Math.PI / 4;
  return {
    id: "__nadir",
    imageLayer: url,
    opacity: opacityPct / 100,
    // esquinas: arriba-izq, arriba-der, abajo-der, abajo-izq (arriba = hacia donde mira la cámara)
    position: [
      { yaw: -q, pitch },
      { yaw: q, pitch },
      { yaw: 3 * q, pitch },
      { yaw: -3 * q, pitch },
    ] as [{ yaw: number; pitch: number }, { yaw: number; pitch: number }, { yaw: number; pitch: number }, { yaw: number; pitch: number }],
  };
}
