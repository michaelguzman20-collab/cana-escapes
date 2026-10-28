import { SYSTEM } from "@photo-sphere-viewer/core";

// Ajustes comunes de Photo Sphere Viewer para el visor público y el del editor.

/**
 * En teléfonos la foto 8K (8192x4096 ≈ 128 MB en la tarjeta gráfica) se reduce a 5760 px de ancho:
 * se ve casi igual en pantalla, carga más rápido y no agota la memoria al pasar de una foto a otra
 * (en iPhone, durante la transición conviven dos fotos y Safari terminaba sin poder cargar la siguiente).
 * 5760x2880 queda bajo el límite de lienzo de iOS (16,7 MP).
 */
export function limitTexturesOnPhones() {
  const phone = window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 768;
  if (!phone) return;
  try {
    SYSTEM.load();
  } catch {
    return; // sin WebGL: el visor mostrará su propio error
  }
  const MAX = 5760;
  if (SYSTEM.maxTextureWidth > MAX) {
    SYSTEM.maxTextureWidth = MAX;
    (SYSTEM as unknown as { __maxCanvasWidth: number | null }).__maxCanvasWidth = null; // se recalcula con el nuevo tope
  }
}

/** Textos del visor (botones de la barra) en inglés */
export const PSV_LANG_EN = {
  zoom: "Zoom", zoomOut: "Zoom out", zoomIn: "Zoom in", moveUp: "Move up", moveDown: "Move down",
  moveLeft: "Move left", moveRight: "Move right", fullscreen: "Fullscreen", close: "Close", twoFingers: "Use two fingers to navigate",
  ctrlZoom: "Use ctrl + scroll to zoom the image", loadError: "The photo could not be loaded", menu: "Menu",
  autorotate: "Automatic rotation", gyroscope: "Gyroscope",
};

export const PSV_LANG_ES = {
  zoom: "Zoom", zoomOut: "Alejar", zoomIn: "Acercar", moveUp: "Arriba", moveDown: "Abajo",
  moveLeft: "Izquierda", moveRight: "Derecha", fullscreen: "Pantalla completa", close: "Cerrar", twoFingers: "Usa dos dedos para moverte",
  ctrlZoom: "Usa ctrl + rueda para acercar", loadError: "No se pudo cargar la foto", menu: "Menú",
  autorotate: "Girar solo", gyroscope: "Giroscopio",
};
