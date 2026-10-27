// Guías de uso de las apps (/apps/<slug>/guia). Solo texto por ahora; más adelante se
// pueden agregar capturas con un bloque { type: "img" }.
// Si cambias el texto, vuelve a generar los PDF: node scripts/generar-guias-pdf.mjs

type L = { es: string; en: string };
type LList = { es: string[]; en: string[] };

export type GuideBlock =
  | { type: "p"; text: L }
  | { type: "steps"; items: LList }
  | { type: "list"; items: LList }
  | { type: "tip"; text: L }
  | { type: "warn"; text: L }
  | { type: "faq"; items: { q: L; a: L }[] };

export interface GuideSection {
  id: string;
  emoji: string;
  title: L;
  blocks: GuideBlock[];
}

export interface GuidePart {
  title?: L;
  subtitle?: L;
  sections: GuideSection[];
}

export interface AppGuide {
  slug: string;
  name: string;
  icon: string;
  tagline: L;
  parts: GuidePart[];
}

const scanner: AppGuide = {
  slug: "cana-scanner",
  name: "Cana Scanner",
  icon: "/apps/cana-scanner.png",
  tagline: {
    es: "Escanea documentos, edítalos, copia su texto y compártelos en PDF.",
    en: "Scan documents, edit them, copy their text and share them as PDF.",
  },
  parts: [
    {
      sections: [
        {
          id: "que-es",
          emoji: "📄",
          title: { es: "¿Qué es Cana Scanner?", en: "What is Cana Scanner?" },
          blocks: [
            {
              type: "p",
              text: {
                es: "Cana Scanner convierte la cámara de tu teléfono en un escáner. Detecta los bordes del documento, lo recorta y endereza, reconoce el texto y crea un PDF listo para enviar. No necesitas cuenta ni registrarte: tus documentos se guardan solo en tu teléfono.",
                en: "Cana Scanner turns your phone camera into a scanner. It detects the document edges, crops and straightens it, recognizes the text and creates a PDF ready to send. No account or sign-up needed: your documents are stored only on your phone.",
              },
            },
            {
              type: "list",
              items: {
                es: [
                  "Escanear documentos de una o varias páginas (hasta 30 por escaneo).",
                  "Editar: escribir con lápiz, resaltar, borrar y pegar fotos (firma, sello, logo).",
                  "Agregar, quitar y reordenar páginas.",
                  "Copiar el texto del documento (reconocimiento de texto, OCR).",
                  "Compartir el PDF por WhatsApp, correo, Drive o cualquier app.",
                ],
                en: [
                  "Scan one- or multi-page documents (up to 30 per scan).",
                  "Edit: write with a pen, highlight, erase and paste photos (signature, stamp, logo).",
                  "Add, remove and reorder pages.",
                  "Copy the document's text (text recognition, OCR).",
                  "Share the PDF via WhatsApp, email, Drive or any app.",
                ],
              },
            },
          ],
        },
        {
          id: "instalar",
          emoji: "⬇️",
          title: { es: "Instalar la app", en: "Install the app" },
          blocks: [
            {
              type: "steps",
              items: {
                es: [
                  "Desde tu teléfono Android entra a canaescapes.com/apps y toca «Descargar APK» en Cana Scanner.",
                  "Abre el archivo descargado (desde la notificación o la carpeta Descargas).",
                  "Si Android lo pide, permite «Instalar apps de orígenes desconocidos» para tu navegador.",
                  "Toca «Instalar» y luego «Abrir».",
                ],
                en: [
                  "On your Android phone go to canaescapes.com/apps and tap “Download APK” under Cana Scanner.",
                  "Open the downloaded file (from the notification or the Downloads folder).",
                  "If Android asks, allow “Install unknown apps” for your browser.",
                  "Tap “Install” and then “Open”.",
                ],
              },
            },
            {
              type: "tip",
              text: {
                es: "La primera vez, ten internet: el teléfono descarga en segundo plano los componentes de Google para escanear y reconocer texto. Después funciona sin problema.",
                en: "The first time, stay online: the phone downloads Google's scanning and text-recognition components in the background. After that it works smoothly.",
              },
            },
          ],
        },
        {
          id: "escanear",
          emoji: "📸",
          title: { es: "Escanear un documento", en: "Scan a document" },
          blocks: [
            {
              type: "steps",
              items: {
                es: [
                  "Toca el botón grande «Escanear documento».",
                  "Apunta la cámara al documento. El escáner detecta los bordes y toma la foto solo; también puedes tomarla tú con el botón de captura.",
                  "Revisa la página: puedes recortar, rotar, aplicar un filtro (por ejemplo blanco y negro) o limpiar manchas y dedos.",
                  "Para un documento de varias páginas, usa la opción de agregar otra página y escanea la siguiente.",
                  "Si ya tienes la foto en la galería, puedes importarla desde el mismo escáner.",
                  "Cuando termines, toca guardar. Verás «Reconociendo texto y creando PDF…».",
                  "Aparece «Documento listo» con dos opciones: «Editar» o «Compartir». También puedes cerrar el mensaje y el documento queda guardado.",
                ],
                en: [
                  "Tap the big “Escanear documento” (Scan document) button.",
                  "Point the camera at the document. The scanner detects the edges and takes the photo automatically; you can also take it yourself with the shutter button.",
                  "Review the page: you can crop, rotate, apply a filter (e.g. black and white) or clean stains and fingers.",
                  "For a multi-page document, use the add-page option and scan the next one.",
                  "If the photo is already in your gallery, you can import it from the scanner itself.",
                  "When you're done, tap save. You'll see “Reconociendo texto y creando PDF…” (recognizing text and creating PDF).",
                  "“Documento listo” (Document ready) appears with two options: “Editar” (Edit) or “Compartir” (Share). You can also close the message — the document is already saved.",
                ],
              },
            },
            {
              type: "tip",
              text: {
                es: "Para un mejor resultado: buena luz, el documento plano y sobre un fondo que contraste (por ejemplo papel blanco sobre una mesa oscura).",
                en: "For best results: good light, the document flat and on a contrasting background (e.g. white paper on a dark table).",
              },
            },
            {
              type: "p",
              text: {
                es: "Cada documento se nombra automáticamente con la fecha y hora, por ejemplo «Escaneo 2026-10-18 09.30». Puedes cambiarle el nombre cuando quieras.",
                en: "Each document is named automatically with the date and time, e.g. “Escaneo 2026-10-18 09.30”. You can rename it at any time.",
              },
            },
          ],
        },
        {
          id: "documentos",
          emoji: "🗂️",
          title: { es: "Mis documentos", en: "My documents" },
          blocks: [
            {
              type: "p",
              text: {
                es: "En la pantalla principal, debajo de «MIS DOCUMENTOS», aparece cada documento con su nombre, número de páginas, tamaño y fecha. Toca el documento para abrirlo. Debajo tiene estos botones:",
                en: "On the main screen, under “MIS DOCUMENTOS” (my documents), each document shows its name, number of pages, size and date. Tap a document to open it. Below it you'll find these buttons:",
              },
            },
            {
              type: "list",
              items: {
                es: [
                  "Compartir — envía el PDF por WhatsApp, correo, Drive, etc.",
                  "Abrir — muestra el PDF en el lector de tu teléfono.",
                  "Editar — abre el editor (lápiz, resaltador, fotos, páginas).",
                  "Texto — muestra el texto reconocido para copiarlo.",
                  "Renombrar — cambia el nombre del documento (y del PDF que compartes).",
                  "Eliminar — borra el documento. No se puede deshacer.",
                ],
                en: [
                  "Compartir (Share) — send the PDF via WhatsApp, email, Drive, etc.",
                  "Abrir (Open) — show the PDF in your phone's PDF reader.",
                  "Editar (Edit) — open the editor (pen, highlighter, photos, pages).",
                  "Texto (Text) — show the recognized text so you can copy it.",
                  "Renombrar (Rename) — change the document name (and the shared PDF's name).",
                  "Eliminar (Delete) — delete the document. This can't be undone.",
                ],
              },
            },
          ],
        },
        {
          id: "editar",
          emoji: "✏️",
          title: { es: "Editar un documento", en: "Edit a document" },
          blocks: [
            {
              type: "p",
              text: {
                es: "Toca «Editar» en un documento. Arriba tienes «Cancelar» y «Guardar»; en el centro la página, y con las flechas ‹ › pasas de una página a otra («Página 1 de 3»). Abajo están las herramientas:",
                en: "Tap “Editar” on a document. At the top you have “Cancelar” (Cancel) and “Guardar” (Save); the page is in the middle, and the ‹ › arrows move between pages (“Página 1 de 3”). The tools are at the bottom:",
              },
            },
            {
              type: "list",
              items: {
                es: [
                  "✎ Lápiz — escribe o firma con el dedo. Elige el color debajo.",
                  "▮ Resaltar — marca texto como con un resaltador (color translúcido).",
                  "⌫ Borrar — toca un trazo para borrarlo.",
                  "✋ Mover foto — mueve una foto pegada. Arrástrala; usa la esquina o dos dedos para cambiar su tamaño. «Quitar foto» la elimina.",
                  "↶ Deshacer — deshace el último cambio.",
                  "Limpiar — borra todos los trazos de la página actual.",
                ],
                en: [
                  "✎ Lápiz (Pen) — write or sign with your finger. Pick the color below.",
                  "▮ Resaltar (Highlight) — mark text like a highlighter (translucent color).",
                  "⌫ Borrar (Erase) — tap a stroke to erase it.",
                  "✋ Mover foto (Move photo) — move a pasted photo. Drag it; use the corner or two fingers to resize it. “Quitar foto” removes it.",
                  "↶ Deshacer (Undo) — undo the last change.",
                  "Limpiar (Clear) — erase all strokes on the current page.",
                ],
              },
            },
            {
              type: "p",
              text: {
                es: "Para organizar las páginas:",
                en: "To organize pages:",
              },
            },
            {
              type: "list",
              items: {
                es: [
                  "+ Página — escanea más páginas y las agrega al documento.",
                  "+ Foto — pega una foto de tu galería encima de la página (ideal para una firma, un sello o un logo).",
                  "⇠ Antes / Después ⇢ — mueve la página actual hacia adelante o hacia atrás.",
                  "Quitar página — elimina la página actual (el documento debe tener al menos una).",
                ],
                en: [
                  "+ Página (Page) — scan more pages and add them to the document.",
                  "+ Foto (Photo) — paste a photo from your gallery on top of the page (great for a signature, stamp or logo).",
                  "⇠ Antes / Después ⇢ (Before / After) — move the current page earlier or later.",
                  "Quitar página (Remove page) — delete the current page (the document must keep at least one).",
                ],
              },
            },
            {
              type: "tip",
              text: {
                es: "Toca «Guardar» para crear el PDF con tus cambios. Si tocas «Cancelar» o el gesto de atrás, la app te pregunta antes de descartar lo que no guardaste.",
                en: "Tap “Guardar” to create the PDF with your changes. If you tap “Cancelar” or use the back gesture, the app asks before discarding unsaved changes.",
              },
            },
          ],
        },
        {
          id: "texto",
          emoji: "🔤",
          title: { es: "Copiar el texto (OCR)", en: "Copy the text (OCR)" },
          blocks: [
            {
              type: "p",
              text: {
                es: "Cana Scanner lee el texto de cada página. Así puedes copiarlo para pegarlo en un mensaje o documento, y además el PDF queda «buscable»: en el lector de PDF puedes buscar palabras y seleccionar texto.",
                en: "Cana Scanner reads the text on each page. You can copy it to paste into a message or document, and the PDF becomes “searchable”: in a PDF reader you can search for words and select text.",
              },
            },
            {
              type: "steps",
              items: {
                es: [
                  "Toca «Texto» en el documento.",
                  "«Copiar todo» copia el texto de todas las páginas.",
                  "«Copiar» al lado de cada página copia solo esa página.",
                  "Para copiar solo una parte, mantén presionado el texto y selecciona lo que necesitas.",
                ],
                en: [
                  "Tap “Texto” on the document.",
                  "“Copiar todo” (Copy all) copies the text of every page.",
                  "“Copiar” (Copy) next to each page copies only that page.",
                  "To copy just a part, press and hold the text and select what you need.",
                ],
              },
            },
            {
              type: "tip",
              text: {
                es: "Si recién instalaste la app, el primer documento puede salir sin texto mientras el teléfono descarga el lector. Toca «Texto» más tarde (con internet) y lo reconoce.",
                en: "If you just installed the app, the first document may come out without text while the phone downloads the reader. Tap “Texto” later (while online) and it will be recognized.",
              },
            },
          ],
        },
        {
          id: "compartir",
          emoji: "📤",
          title: { es: "Compartir el PDF", en: "Share the PDF" },
          blocks: [
            {
              type: "steps",
              items: {
                es: [
                  "Toca «Compartir» en el documento (o en el mensaje «Documento listo»).",
                  "Elige la app: WhatsApp, Gmail, Drive, Telegram…",
                  "El PDF se envía con el nombre del documento.",
                ],
                en: [
                  "Tap “Compartir” on the document (or in the “Documento listo” message).",
                  "Choose the app: WhatsApp, Gmail, Drive, Telegram…",
                  "The PDF is sent with the document's name.",
                ],
              },
            },
            {
              type: "tip",
              text: {
                es: "Cámbiale el nombre antes de enviarlo (por ejemplo «Contrato Apto 302») para que quien lo reciba sepa qué es.",
                en: "Rename it before sending (e.g. “Contract Apt 302”) so the recipient knows what it is.",
              },
            },
          ],
        },
        {
          id: "actualizar",
          emoji: "🔄",
          title: { es: "Actualizaciones", en: "Updates" },
          blocks: [
            {
              type: "p",
              text: {
                es: "Cuando hay una versión nueva, la app muestra arriba «Nueva versión disponible» con lo nuevo. Toca «Actualizar» y luego «Instalar». Tus documentos no se pierden. También puedes revisar a mano tocando «Buscar actualizaciones» al final de la pantalla principal.",
                en: "When a new version is out, the app shows “Nueva versión disponible” (new version available) at the top with what's new. Tap “Actualizar” (Update) and then “Install”. Your documents are kept. You can also check manually by tapping “Buscar actualizaciones” (check for updates) at the bottom of the main screen.",
              },
            },
          ],
        },
        {
          id: "preguntas",
          emoji: "❓",
          title: { es: "Preguntas frecuentes", en: "FAQ" },
          blocks: [
            {
              type: "faq",
              items: [
                {
                  q: { es: "¿Mis documentos se suben a internet?", en: "Are my documents uploaded to the internet?" },
                  a: {
                    es: "No. Se guardan solo en tu teléfono. Solo salen de él cuando tú los compartes.",
                    en: "No. They're stored only on your phone. They only leave it when you share them.",
                  },
                },
                {
                  q: { es: "¿Qué pasa si desinstalo la app?", en: "What happens if I uninstall the app?" },
                  a: {
                    es: "Android borra los documentos junto con la app. Guarda los importantes en Drive o envíatelos antes. Actualizar la app, en cambio, no borra nada.",
                    en: "Android deletes the documents along with the app. Save important ones to Drive or send them to yourself first. Updating the app, on the other hand, keeps everything.",
                  },
                },
                {
                  q: { es: "Dice «Sin visor de PDF» al tocar «Abrir».", en: "It says “Sin visor de PDF” (no PDF viewer) when I tap “Abrir”." },
                  a: {
                    es: "Tu teléfono no tiene lector de PDF. Instala Google Drive (o cualquier lector) o usa «Compartir».",
                    en: "Your phone has no PDF reader. Install Google Drive (or any reader) or use “Compartir”.",
                  },
                },
                {
                  q: { es: "El documento no tiene texto.", en: "The document has no text." },
                  a: {
                    es: "Toca «Texto» de nuevo con internet. Si la foto está borrosa o con poca luz, vuelve a escanear.",
                    en: "Tap “Texto” again while online. If the photo is blurry or dark, scan it again.",
                  },
                },
                {
                  q: { es: "¿Cuántas páginas puede tener un documento?", en: "How many pages can a document have?" },
                  a: {
                    es: "Hasta 30 por escaneo, y con «+ Página» en el editor puedes seguir agregando más.",
                    en: "Up to 30 per scan, and with “+ Página” in the editor you can keep adding more.",
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const track: AppGuide = {
  slug: "cana-track",
  name: "Cana Track",
  icon: "/apps/cana-track.png",
  tagline: {
    es: "Comparte tu ubicación en tiempo real con tu equipo, y ve a tu equipo en el mapa.",
    en: "Share your real-time location with your team, and see your team on the map.",
  },
  parts: [
    {
      sections: [
        {
          id: "que-es",
          emoji: "📍",
          title: { es: "¿Qué es Cana Track?", en: "What is Cana Track?" },
          blocks: [
            {
              type: "p",
              text: {
                es: "Cana Track permite que un equipo de trabajo (transporte, mensajería en moto, personal en la calle) comparta su ubicación en tiempo real con su administrador. Hay dos tipos de persona en la app:",
                en: "Cana Track lets a work team (transport, motorbike delivery, staff on the move) share their real-time location with their administrator. There are two kinds of people in the app:",
              },
            },
            {
              type: "list",
              items: {
                es: [
                  "Usuario — la persona que comparte su ubicación. Entra solo con su nombre y WhatsApp.",
                  "Administrador — ve a su equipo en el mapa, les envía avisos y revisa el historial.",
                ],
                en: [
                  "User — the person sharing their location. Joins with just their name and WhatsApp.",
                  "Administrator — sees the team on the map, sends them alerts and reviews the history.",
                ],
              },
            },
            {
              type: "tip",
              text: {
                es: "La ubicación solo se comparte mientras el usuario lo tiene activado, y siempre se ve una notificación fija mientras tanto.",
                en: "Location is only shared while the user has it turned on, and a persistent notification is always visible meanwhile.",
              },
            },
          ],
        },
        {
          id: "instalar",
          emoji: "⬇️",
          title: { es: "Instalar la app", en: "Install the app" },
          blocks: [
            {
              type: "steps",
              items: {
                es: [
                  "Desde tu teléfono Android entra a canaescapes.com/apps y toca «Descargar APK» en Cana Track.",
                  "Abre el archivo descargado (desde la notificación o la carpeta Descargas).",
                  "Si Android lo pide, permite «Instalar apps de orígenes desconocidos» para tu navegador.",
                  "Toca «Instalar» y luego «Abrir».",
                ],
                en: [
                  "On your Android phone go to canaescapes.com/apps and tap “Download APK” under Cana Track.",
                  "Open the downloaded file (from the notification or the Downloads folder).",
                  "If Android asks, allow “Install unknown apps” for your browser.",
                  "Tap “Install” and then “Open”.",
                ],
              },
            },
          ],
        },
      ],
    },
    {
      title: { es: "Para el usuario", en: "For users" },
      subtitle: { es: "La persona que comparte su ubicación", en: "The person sharing their location" },
      sections: [
        {
          id: "unirse",
          emoji: "👋",
          title: { es: "Entrar a la app", en: "Join" },
          blocks: [
            {
              type: "steps",
              items: {
                es: [
                  "Abre Cana Track.",
                  "Escribe tu nombre y tu número de WhatsApp (por ejemplo 809…).",
                  "Elige tu vehículo: 🏍️ Moto, 🚗 Carro, 🚙 Jeepeta, 🚐 Minivan, 🛻 Camioneta, 🚌 Guagua, 🚚 Camión, 🚲 Bicicleta o 🚶 A pie.",
                  "Si quieres, escribe la placa o un detalle del vehículo (opcional).",
                  "Toca «Guardar». Listo: no necesitas contraseña, la app te recuerda.",
                ],
                en: [
                  "Open Cana Track.",
                  "Type your name and your WhatsApp number (e.g. 809…).",
                  "Pick your vehicle: 🏍️ Motorbike, 🚗 Car, 🚙 SUV, 🚐 Minivan, 🛻 Pickup, 🚌 Bus, 🚚 Truck, 🚲 Bicycle or 🚶 On foot.",
                  "Optionally, type the plate or a vehicle detail.",
                  "Tap “Guardar” (Save). Done: no password needed, the app remembers you.",
                ],
              },
            },
            {
              type: "tip",
              text: {
                es: "Si cambias de teléfono o reinstalas la app, entra con el mismo WhatsApp y se conserva tu historial. Para corregir tu nombre, WhatsApp o vehículo, toca tu tarjeta («Toca para editar»).",
                en: "If you switch phones or reinstall the app, join with the same WhatsApp and your history is kept. To fix your name, WhatsApp or vehicle, tap your card (“Toca para editar”).",
              },
            },
          ],
        },
        {
          id: "compartir",
          emoji: "🟢",
          title: { es: "Compartir tu ubicación", en: "Share your location" },
          blocks: [
            {
              type: "steps",
              items: {
                es: [
                  "Toca el botón grande «Compartir ubicación».",
                  "La primera vez, Android pide permiso de ubicación: acéptalo.",
                  "La app te explica y te lleva a elegir «Permitir todo el tiempo». Es necesario para seguir compartiendo con la pantalla apagada o usando otras apps.",
                  "También te pide quitar la optimización de batería para Cana Track: acéptalo, así Android no la cierra.",
                  "El botón se pone verde con un pulso y el estado dice «Compartiendo». Arriba verás la notificación «Cana Track · Compartiendo ubicación».",
                  "Cuando termines, toca «Dejar de compartir». Tu equipo deja de verte.",
                ],
                en: [
                  "Tap the big “Compartir ubicación” (Share location) button.",
                  "The first time, Android asks for location permission: allow it.",
                  "The app explains and takes you to choose “Allow all the time”. This is needed to keep sharing with the screen off or while using other apps.",
                  "It also asks to remove battery optimization for Cana Track: accept, so Android doesn't close it.",
                  "The button turns green with a pulse and the status says “Compartiendo” (sharing). You'll see the “Cana Track · Compartiendo ubicación” notification at the top.",
                  "When you're done, tap “Dejar de compartir” (Stop sharing). Your team stops seeing you.",
                ],
              },
            },
          ],
        },
        {
          id: "pantalla",
          emoji: "📱",
          title: { es: "Tu pantalla", en: "Your screen" },
          blocks: [
            {
              type: "list",
              items: {
                es: [
                  "Estado — «Compartiendo» o «Sin compartir».",
                  "Batería — tu nivel de batería, que también ve tu administrador.",
                  "Último envío — hace cuánto se envió tu última ubicación.",
                  "Pendientes (sin señal) — ubicaciones guardadas mientras no tenías señal; se envían solas cuando vuelve.",
                  "↻ Actualizar ubicación — envía tu ubicación en ese momento y reinicia el envío si algo se trabó.",
                  "Escribir a la oficina por WhatsApp — abre el chat con tu administrador.",
                ],
                en: [
                  "Estado (Status) — “Compartiendo” (sharing) or “Sin compartir” (not sharing).",
                  "Batería (Battery) — your battery level, which your administrator also sees.",
                  "Último envío (Last sent) — how long ago your last location was sent.",
                  "Pendientes (sin señal) (Pending, no signal) — locations saved while you had no signal; they're sent automatically when it returns.",
                  "↻ Actualizar ubicación (Update location) — sends your location right now and restarts sending if something got stuck.",
                  "Escribir a la oficina por WhatsApp — opens the chat with your administrator.",
                ],
              },
            },
          ],
        },
        {
          id: "timbre",
          emoji: "🔔",
          title: { es: "El timbre", en: "The ping (timbre)" },
          blocks: [
            {
              type: "p",
              text: {
                es: "Tu administrador puede enviarte un «timbre»: te llega una notificación «Timbre de la oficina» pidiéndote que le escribas. Tócala y se abre WhatsApp con el mensaje «Hola, recibí el timbre.» listo para enviar.",
                en: "Your administrator can send you a “timbre” (ping): you get a “Timbre de la oficina” notification asking you to write back. Tap it and WhatsApp opens with “Hola, recibí el timbre.” (Hi, I got the ping) ready to send.",
              },
            },
            {
              type: "tip",
              text: {
                es: "El timbre llega mientras estás compartiendo tu ubicación, normalmente en unos segundos.",
                en: "The ping arrives while you're sharing your location, usually within seconds.",
              },
            },
          ],
        },
        {
          id: "bateria",
          emoji: "🔋",
          title: { es: "Consejos de batería y señal", en: "Battery and signal tips" },
          blocks: [
            {
              type: "list",
              items: {
                es: [
                  "Comparte solo mientras trabajas y toca «Dejar de compartir» al terminar.",
                  "En algunos teléfonos (Samsung, Xiaomi, Huawei…) revisa en Ajustes › Apps › Cana Track › Batería que esté en «Sin restricciones».",
                  "No cierres la app deslizándola en «Recientes» mientras compartes.",
                  "Si tu administrador te dice que no te ve, toca «↻ Actualizar ubicación».",
                ],
                en: [
                  "Share only while working and tap “Dejar de compartir” when done.",
                  "On some phones (Samsung, Xiaomi, Huawei…) check Settings › Apps › Cana Track › Battery is set to “Unrestricted”.",
                  "Don't swipe the app away from “Recents” while sharing.",
                  "If your administrator says they can't see you, tap “↻ Actualizar ubicación”.",
                ],
              },
            },
          ],
        },
      ],
    },
    {
      title: { es: "Para el administrador", en: "For administrators" },
      subtitle: { es: "Quien ve al equipo en el mapa", en: "Who sees the team on the map" },
      sections: [
        {
          id: "cuenta-admin",
          emoji: "🔑",
          title: { es: "Crear tu cuenta de administrador", en: "Create your administrator account" },
          blocks: [
            {
              type: "steps",
              items: {
                es: [
                  "En la pantalla de entrada toca «Soy administrador» y luego «Crear cuenta de administrador».",
                  "Escribe tu nombre, tu WhatsApp (ahí te escribirán tus usuarios), tu correo y una contraseña de al menos 6 caracteres.",
                  "Toca «Crear cuenta». Verás «Cuenta pendiente»: Cana Escapes activa tu cuenta y te asigna tu equipo.",
                  "Cuando esté activa, entra con «Soy administrador», tu correo y tu contraseña («Entrar»). La app recuerda tu correo.",
                ],
                en: [
                  "On the start screen tap “Soy administrador” (I'm an administrator) and then “Crear cuenta de administrador”.",
                  "Type your name, your WhatsApp (your users will write to you there), your email and a password of at least 6 characters.",
                  "Tap “Crear cuenta”. You'll see “Cuenta pendiente” (pending account): Cana Escapes activates your account and assigns your team.",
                  "Once active, sign in with “Soy administrador”, your email and password (“Entrar”). The app remembers your email.",
                ],
              },
            },
            {
              type: "tip",
              text: {
                es: "Para sumar personas a tu equipo, compárteles el enlace canaescapes.com/apps para que instalen Cana Track y entren con su nombre y WhatsApp.",
                en: "To add people to your team, share the link canaescapes.com/apps so they install Cana Track and join with their name and WhatsApp.",
              },
            },
          ],
        },
        {
          id: "mapa",
          emoji: "🗺️",
          title: { es: "El mapa y la lista", en: "The map and the list" },
          blocks: [
            {
              type: "p",
              text: {
                es: "Al entrar ves el mapa con tu equipo y, debajo, la lista de usuarios con el emoji de su vehículo y un punto de color:",
                en: "When you sign in you see the map with your team and, below it, the user list with each vehicle's emoji and a colored dot:",
              },
            },
            {
              type: "list",
              items: {
                es: [
                  "En vivo — está compartiendo y enviando ubicación.",
                  "Sin señal reciente — está compartiendo pero hace rato no llega su ubicación (sin señal o el teléfono cerró la app).",
                  "Sin compartir — tiene la ubicación apagada.",
                ],
                en: [
                  "En vivo (Live) — sharing and sending location.",
                  "Sin señal reciente (No recent signal) — sharing, but no location has arrived for a while (no signal, or the phone closed the app).",
                  "Sin compartir (Not sharing) — location is turned off.",
                ],
              },
            },
            {
              type: "p",
              text: {
                es: "Botones del mapa: 🚦 Tráfico (muestra el tráfico), 🛰️ Satélite (vista satelital) y «Ver todos» (encuadra a todo el equipo).",
                en: "Map buttons: 🚦 Tráfico (shows traffic), 🛰️ Satélite (satellite view) and “Ver todos” (fit the whole team on screen).",
              },
            },
          ],
        },
        {
          id: "ficha",
          emoji: "👤",
          title: { es: "Ver a un usuario", en: "View a user" },
          blocks: [
            {
              type: "p",
              text: {
                es: "Toca un usuario en la lista o en el mapa. Verás:",
                en: "Tap a user in the list or on the map. You'll see:",
              },
            },
            {
              type: "list",
              items: {
                es: [
                  "📍 El sector o dirección donde está, con «Ver en Google Maps» para navegar hasta él.",
                  "Estado, velocidad, batería y hace cuánto se actualizó.",
                  "El recorrido del viaje actual dibujado en el mapa.",
                  "🔔 Timbre — le envía un aviso para que te escriba. Verás cuando lo recibió.",
                  "WhatsApp y Llamar — para contactarlo directo.",
                ],
                en: [
                  "📍 The area or address where they are, with “Ver en Google Maps” to navigate there.",
                  "Status, speed, battery and how long ago it was updated.",
                  "The current trip's route drawn on the map.",
                  "🔔 Timbre (Ping) — sends an alert asking them to write to you. You'll see when they got it.",
                  "WhatsApp and Llamar (Call) — to contact them directly.",
                ],
              },
            },
            {
              type: "warn",
              text: {
                es: "Para enviar timbres, primero pon tu WhatsApp en «Ajustes». Es el número al que tus usuarios te escribirán.",
                en: "To send pings, first set your WhatsApp in “Ajustes” (Settings). It's the number your users will write to.",
              },
            },
          ],
        },
        {
          id: "ajustes",
          emoji: "⚙️",
          title: { es: "Ajustes y salir", en: "Settings and leaving" },
          blocks: [
            {
              type: "list",
              items: {
                es: [
                  "Ajustes — tu WhatsApp para recibir mensajes, la lista de usuarios de tu equipo y «Cerrar sesión».",
                  "Salir — cierra la app pero tu sesión queda guardada; la próxima vez entras directo.",
                  "Cerrar sesión — tendrás que escribir tu correo y contraseña para volver a entrar.",
                ],
                en: [
                  "Ajustes (Settings) — your WhatsApp for messages, your team's user list and “Cerrar sesión” (sign out).",
                  "Salir (Exit) — closes the app but keeps you signed in; next time you go straight in.",
                  "Cerrar sesión (Sign out) — you'll need your email and password to get back in.",
                ],
              },
            },
          ],
        },
        {
          id: "web",
          emoji: "💻",
          title: { es: "Panel web", en: "Web dashboard" },
          blocks: [
            {
              type: "p",
              text: {
                es: "También puedes ver a tu equipo desde la computadora: entra a canaescapes.com › Acceder con tu mismo correo y contraseña. Tendrás un mapa grande en vivo, la lista de usuarios con su batería, el timbre y WhatsApp, y el historial de sesiones (cuándo empezó y terminó cada uno a compartir, la duración y la batería).",
                en: "You can also see your team from a computer: go to canaescapes.com › Acceder (Sign in) with the same email and password. You'll get a large live map, the user list with battery, ping and WhatsApp, and the session history (when each person started and stopped sharing, the duration and battery).",
              },
            },
          ],
        },
        {
          id: "preguntas",
          emoji: "❓",
          title: { es: "Preguntas frecuentes", en: "FAQ" },
          blocks: [
            {
              type: "faq",
              items: [
                {
                  q: { es: "¿Me pueden ver cuando no estoy compartiendo?", en: "Can they see me when I'm not sharing?" },
                  a: {
                    es: "No. Solo se envía tu ubicación mientras el botón está en «Compartiendo» y ves la notificación fija.",
                    en: "No. Your location is only sent while the button shows “Compartiendo” and you see the persistent notification.",
                  },
                },
                {
                  q: { es: "Un usuario sale «Sin señal reciente».", en: "A user shows “Sin señal reciente”." },
                  a: {
                    es: "Puede estar en una zona sin señal (las ubicaciones se envían al volver) o su teléfono cerró la app. Pídele que toque «↻ Actualizar ubicación» y revise los ajustes de batería.",
                    en: "They may be in an area with no signal (locations are sent when it returns) or their phone closed the app. Ask them to tap “↻ Actualizar ubicación” and check the battery settings.",
                  },
                },
                {
                  q: { es: "No aparece nadie en mi lista.", en: "Nobody appears in my list." },
                  a: {
                    es: "Tus usuarios deben instalar la app y entrar; luego Cana Escapes los asigna a tu equipo. Escríbenos si falta alguien.",
                    en: "Your users must install the app and join; then Cana Escapes assigns them to your team. Message us if someone is missing.",
                  },
                },
                {
                  q: { es: "¿Cuánto tiempo se guarda el historial?", en: "How long is the history kept?" },
                  a: {
                    es: "Los recorridos se guardan 30 días.",
                    en: "Routes are kept for 30 days.",
                  },
                },
                {
                  q: { es: "¿Cómo actualizo la app?", en: "How do I update the app?" },
                  a: {
                    es: "Cuando hay una versión nueva, la app te pregunta al abrirla. Toca «Actualizar» y luego «Instalar». No pierdes tus datos.",
                    en: "When a new version is out, the app asks when you open it. Tap “Actualizar” and then “Install”. Your data is kept.",
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const check: AppGuide = {
  slug: "cana-check",
  name: "Cana Check",
  icon: "/apps/cana-check.png",
  tagline: {
    es: "Mantenimiento preventivo de tus propiedades: recordatorios dinámicos, récord con fotos, checklists y reportes.",
    en: "Preventive maintenance for your properties: dynamic reminders, photo records, checklists and reports.",
  },
  parts: [
    {
      sections: [
        {
          id: "que-es",
          emoji: "🏠",
          title: { es: "¿Qué es Cana Check?", en: "What is Cana Check?" },
          blocks: [
            {
              type: "p",
              text: {
                es: "Cana Check te dice qué mantenimiento preventivo toca en cada propiedad y cuándo, te lo recuerda y guarda el récord de lo que se hizo, con fotos. Sirve para propiedades, rentas cortas y condominios, y está pensada para Punta Cana y Bávaro (salitre, humedad, temporada ciclónica). No necesitas cuenta: tus datos se guardan solo en tu teléfono.",
                en: "Cana Check tells you which preventive maintenance is due at each property and when, reminds you and keeps a record of what was done, with photos. It works for properties, short-term rentals and condos, and is designed for Punta Cana and Bávaro (salt air, humidity, hurricane season). No account needed: your data stays on your phone.",
              },
            },
            {
              type: "list",
              items: {
                es: [
                  "Una o varias propiedades: apartamento, villa, casa o áreas comunes de condominio.",
                  "Plan de mantenimiento armado según los equipos de cada propiedad (AC, piscina, cisterna, inversor, planta…).",
                  "Recordatorios dinámicos que se ajustan a lo que haces, con el porqué de cada tarea.",
                  "Días de ocupación para hacer los trabajos cuando no hay huéspedes.",
                  "Tablero de trabajos: pendiente, agendado, en proceso y completado.",
                  "Checklists de inspección detallados según el tipo de propiedad, con notas y fotos.",
                  "Fotos de antes y después, reportes en PDF por las fechas que elijas y exportar a Excel.",
                ],
                en: [
                  "One or more properties: apartment, villa, house or condo common areas.",
                  "Maintenance plan built from each property's equipment (AC, pool, cistern, inverter, generator…).",
                  "Dynamic reminders that adjust to what you do, with the reason behind each task.",
                  "Occupancy days so work gets done when there are no guests.",
                  "Job board: pending, scheduled, in progress and done.",
                  "Detailed inspection checklists by property type, with notes and photos.",
                  "Before and after photos, PDF reports for any dates you choose and Excel export.",
                ],
              },
            },
          ],
        },
        {
          id: "empezar",
          emoji: "🚀",
          title: { es: "Primeros pasos", en: "Getting started" },
          blocks: [
            {
              type: "steps",
              items: {
                es: [
                  "Abre la app y elige el idioma, cómo la vas a usar (propietario, administrador o técnico) y tu nombre.",
                  "Acepta el permiso de notificaciones: así llegan los recordatorios.",
                  "Toca «Agregar propiedad»: ponle nombre, elige el tipo y marca los equipos e instalaciones que tiene.",
                  "Si la rentas por días, deja activado «Renta corta» y agrega los días de ocupación.",
                ],
                en: [
                  "Open the app and choose the language, how you'll use it (owner, manager or technician) and your name.",
                  "Allow notifications: that's how reminders reach you.",
                  "Tap “Add property”: name it, pick the type and select the equipment and facilities it has.",
                  "If you rent it by the night, keep “Short-term rental” on and add the occupancy days.",
                ],
              },
            },
            {
              type: "tip",
              text: {
                es: "¿Quieres verla funcionando antes de cargar tus datos? En Inicio toca «Ver con una propiedad de ejemplo» (trae trabajos, ocupación y un checklist). Luego puedes borrarla en Propiedades manteniéndola presionada → Eliminar.",
                en: "Want to see it working before entering your data? On Home tap “Try it with a sample property” (it comes with jobs, occupancy and a checklist). You can delete it later in Properties by pressing and holding it → Delete.",
              },
            },
          ],
        },
        {
          id: "inicio",
          emoji: "📱",
          title: { es: "Inicio y Propiedades", en: "Home and Properties" },
          blocks: [
            {
              type: "list",
              items: {
                es: [
                  "Los cuatro indicadores de arriba (Vencidas, Por hacer, En proceso, Hechos este mes) abren Trabajos mostrando solo eso. Toca «Ver todo» para quitar el filtro.",
                  "Gráficas: estado del plan (% al día), trabajos completados de los últimos 6 meses y ocupación de los próximos 30 días.",
                  "«Necesitan atención» se despliega al tocarlo y muestra las tareas vencidas y próximas.",
                  "En Propiedades, el botón + del centro agrega una propiedad. Mantén presionada una propiedad para abrirla, editarla, moverla de lugar o eliminarla (siempre pide confirmación).",
                ],
                en: [
                  "The four indicators at the top (Overdue, Coming up, In progress, Done this month) open Jobs showing only that. Tap “Show all” to clear the filter.",
                  "Charts: plan status (% up to date), jobs completed in the last 6 months and occupancy for the next 30 days.",
                  "“Need attention” expands when you tap it and lists overdue and upcoming tasks.",
                  "In Properties, the + button in the center adds a property. Press and hold a property to open, edit, move or delete it (it always asks for confirmation).",
                ],
              },
            },
          ],
        },
        {
          id: "plan",
          emoji: "🗓️",
          title: { es: "El plan de mantenimiento", en: "The maintenance plan" },
          blocks: [
            {
              type: "p",
              text: {
                es: "En cada propiedad, la pestaña «Plan» muestra las tareas agrupadas por área. Cada una dice su estado: vencida, por hacer, al día o sin registro. Toca una tarea para ver por qué conviene hacerla y qué hacer con ella.",
                en: "In each property, the “Plan” tab lists tasks grouped by area. Each shows its status: overdue, coming up, up to date or no record. Tap a task to see why it matters and what to do with it.",
              },
            },
            {
              type: "list",
              items: {
                es: [
                  "Marcar como hecho: registra el trabajo con fecha, quién lo hizo, costo, notas y fotos.",
                  "Agendar: crea el trabajo con fecha y a quién se le asignó.",
                  "Ya estaba hecho: si no tienes el registro, indica más o menos cuándo se hizo y el plan se pone al día.",
                  "Frecuencia: cámbiala si tu propiedad necesita más o menos.",
                  "No aplica: oculta la tarea (puedes restaurarla al final del plan).",
                  "Agregar tarea propia: para lo que no esté en el catálogo.",
                ],
                en: [
                  "Mark as done: records the job with date, who did it, cost, notes and photos.",
                  "Schedule: creates the job with a date and who it's assigned to.",
                  "Already done: if you have no record, say roughly when it was done and the plan catches up.",
                  "Frequency: change it if your property needs more or less.",
                  "Doesn't apply: hides the task (you can restore it at the end of the plan).",
                  "Add your own task: for anything not in the catalog.",
                ],
              },
            },
            {
              type: "tip",
              text: {
                es: "Antes de la temporada ciclónica (1 de junio) y de la temporada alta (mediados de diciembre), la app adelanta las tareas que conviene tener listas para esas fechas.",
                en: "Before hurricane season (June 1) and high season (mid-December), the app moves up the tasks that should be ready by those dates.",
              },
            },
          ],
        },
        {
          id: "ocupacion",
          emoji: "🛏️",
          title: { es: "Días de ocupación (renta corta)", en: "Occupancy days (short-term rental)" },
          blocks: [
            {
              type: "steps",
              items: {
                es: [
                  "Entra a la propiedad → pestaña «Ocupación» → «Agregar días de ocupación».",
                  "Toca el día de llegada y luego el de salida.",
                  "Elige «Reservado» (reserva confirmada) o «Proyectado» (ocupación que esperas) y guarda.",
                ],
                en: [
                  "Open the property → “Occupancy” tab → “Add occupancy days”.",
                  "Tap the arrival day, then the departure day.",
                  "Choose “Booked” (confirmed) or “Projected” (expected occupancy) and save.",
                ],
              },
            },
            {
              type: "p",
              text: {
                es: "Con eso, Inicio te muestra los próximos días libres y qué conviene hacer en ellos (primero lo que necesita la unidad vacía, como fumigar o pintar), y te avisa si se acerca un periodo de mucha ocupación. Al agendar un trabajo, la app te advierte si ese día hay huéspedes.",
                en: "With that, Home shows the next free days and what to do in them (first what needs an empty unit, like fumigation or painting), and warns you when a busy period is coming. When you schedule a job, the app warns you if there are guests that day.",
              },
            },
          ],
        },
        {
          id: "trabajos",
          emoji: "🔧",
          title: { es: "Trabajos, fotos y quién lo hizo", en: "Jobs, photos and who did it" },
          blocks: [
            {
              type: "p",
              text: {
                es: "La pestaña «Trabajos» es el tablero: Pendiente, Agendado, En proceso y Completado. En «Pendiente» también aparecen las tareas del plan vencidas o próximas. Toca el botón + para crear un trabajo que no esté en el plan (por ejemplo, una reparación).",
                en: "The “Jobs” tab is the board: Pending, Scheduled, In progress and Done. “Pending” also shows plan tasks that are overdue or coming up. Tap + to create a job that isn't in the plan (for example, a repair).",
              },
            },
            {
              type: "list",
              items: {
                es: [
                  "Cualquiera puede marcar un trabajo como completado: propietario, administrador, técnico o un contratista particular.",
                  "Agrega fotos de «Antes» y «Después» con la cámara o desde la galería. Toca una foto para verla en grande o borrarla.",
                  "Con el botón de compartir (arriba) envías el trabajo por WhatsApp como reporte PDF con sus fotos de antes y después, o solo el texto.",
                ],
                en: [
                  "Anyone can mark a job as done: owner, manager, technician or an outside contractor.",
                  "Add “Before” and “After” photos with the camera or from the gallery. Tap a photo to view it full size or delete it.",
                  "Use the share button (top) to send the job on WhatsApp as a PDF report with its before and after photos, or as text only.",
                ],
              },
            },
          ],
        },
        {
          id: "checklists",
          emoji: "✅",
          title: { es: "Checklists de inspección", en: "Inspection checklists" },
          blocks: [
            {
              type: "p",
              text: {
                es: "La pestaña «Checklist» sirve para inspeccionar una propiedad espacio por espacio: en una entrada o salida de huésped, una entrega o una revisión general. Al terminar lo compartes con el responsable o el propietario.",
                en: "The “Checklist” tab lets you inspect a property space by space: at a guest check-in or check-out, a handover or a general review. When you finish, share it with the person in charge or the owner.",
              },
            },
            {
              type: "steps",
              items: {
                es: [
                  "Toca + y elige la propiedad (u «Otra» para un lugar que no tienes guardado).",
                  "Elige el tipo: apartamento, villa, casa o áreas comunes de condominio. Indica cuántas habitaciones y baños tiene y marca sus equipos (piscina, planta, cisterna…): el checklist se arma con todo eso.",
                  "Elige el motivo y crea el checklist.",
                  "Abre cada espacio y marca cada punto: ✓ Bien, ✗ Falla o N/A. Al abrir un espacio se cierra el anterior. Toca un punto para agregarle una nota. Cada espacio tiene sus notas y fotos opcionales.",
                  "¿Falta algo? Agrega elementos dentro de un espacio o espacios nuevos al final. Mantén presionado un elemento o espacio para eliminarlo.",
                  "Al terminar, toca «Marcar como completado» y «Compartir checklist».",
                ],
                en: [
                  "Tap + and choose the property (or “Other” for a place you haven't saved).",
                  "Pick the type: apartment, villa, house or condo common areas. Set how many bedrooms and bathrooms it has and check its equipment (pool, generator, cistern…): the checklist is built from all of that.",
                  "Choose the purpose and create the checklist.",
                  "Open each space and mark each point: ✓ Good, ✗ Issue or N/A. Opening a space closes the previous one. Tap a point to add a note. Each space has its own optional notes and photos.",
                  "Something missing? Add items inside a space or new spaces at the end. Press and hold an item or space to delete it.",
                  "When you're done, tap “Mark as completed” and “Share checklist”.",
                ],
              },
            },
            {
              type: "tip",
              text: {
                es: "Se comparte como reporte PDF (con las fallas primero, notas y fotos) o como resumen de texto para WhatsApp. En una falla puedes tocar «Crear trabajo» para que quede en el tablero. En la lista, mantén presionado un checklist para abrirlo, compartirlo, completarlo o eliminarlo.",
                en: "Share it as a PDF report (issues first, with notes and photos) or as a text summary for WhatsApp. On an issue you can tap “Create job” so it goes on the board. In the list, press and hold a checklist to open, share, complete or delete it.",
              },
            },
          ],
        },
        {
          id: "recordatorios",
          emoji: "🔔",
          title: { es: "Recordatorios dinámicos", en: "Dynamic reminders" },
          blocks: [
            {
              type: "p",
              text: {
                es: "Los recordatorios se ajustan solos: cada vez que marcas un trabajo hecho, agendas, cambias una frecuencia o agregas días de ocupación, la app vuelve a calcular qué toca y cuándo avisarte. Te llegan como notificaciones en el teléfono.",
                en: "Reminders adjust themselves: every time you mark a job done, schedule something, change a frequency or add occupancy days, the app recalculates what's due and when to notify you. They arrive as notifications on your phone.",
              },
            },
            {
              type: "list",
              items: {
                es: [
                  "El día que vence una tarea del plan.",
                  "Un día antes y el mismo día de cada trabajo agendado.",
                  "Un resumen cuando tienes tareas vencidas.",
                  "Un consejo semanal sobre tareas que no tienen registro, con el porqué.",
                  "Avisos de temporada ciclónica y temporada alta.",
                ],
                en: [
                  "The day a plan task is due.",
                  "The day before and the day of each scheduled job.",
                  "A summary when you have overdue tasks.",
                  "A weekly tip about tasks with no record, with the reason why.",
                  "Hurricane-season and high-season alerts.",
                ],
              },
            },
            {
              type: "tip",
              text: {
                es: "En Más → Ajustes eliges la hora de los recordatorios y puedes enviarte uno de prueba.",
                en: "In More → Settings you pick the reminder time and can send yourself a test.",
              },
            },
          ],
        },
        {
          id: "reportes",
          emoji: "📊",
          title: { es: "Reportes, Excel y respaldo", en: "Reports, Excel and backup" },
          blocks: [
            {
              type: "list",
              items: {
                es: [
                  "Reportes (Más): elige el periodo (por mes, últimos 30 días, este año o las fechas que quieras) y la propiedad, y toca «Generar y compartir PDF». Incluye trabajos completados con fotos, en proceso, agendados y pendientes, con el costo total.",
                  "Exportar a Excel: el historial de trabajos y el plan de mantenimiento salen como tablas que abren en Excel o Google Sheets.",
                  "Respaldo: «Exportar respaldo» crea un archivo con todos tus datos, checklists y fotos. Guárdalo en Drive o envíatelo.",
                  "Restaurar: en otro teléfono (o después de reinstalar) toca «Restaurar un respaldo» y elige ese archivo.",
                ],
                en: [
                  "Reports (More): pick the period (by month, last 30 days, this year or any dates you want) and the property, and tap “Generate & share PDF”. It includes completed jobs with photos, in progress, scheduled and pending, with the total cost.",
                  "Excel export: the job history and the maintenance plan come out as tables that open in Excel or Google Sheets.",
                  "Backup: “Export backup” creates a file with all your data, checklists and photos. Keep it in Drive or send it to yourself.",
                  "Restore: on another phone (or after reinstalling) tap “Restore a backup” and pick that file.",
                ],
              },
            },
            {
              type: "warn",
              text: {
                es: "Tus datos están solo en este teléfono. Si desinstalas la app sin un respaldo, se pierden.",
                en: "Your data is only on this phone. If you uninstall the app without a backup, it's lost.",
              },
            },
          ],
        },
        {
          id: "preguntas",
          emoji: "❓",
          title: { es: "Preguntas frecuentes", en: "FAQ" },
          blocks: [
            {
              type: "faq",
              items: [
                {
                  q: { es: "¿Cuesta algo?", en: "Does it cost anything?" },
                  a: {
                    es: "No. Cana Check es gratis, sin publicidad y sin cuenta.",
                    en: "No. Cana Check is free, with no ads and no account.",
                  },
                },
                {
                  q: { es: "¿El administrador y el técnico ven lo mismo?", en: "Do the manager and the technician see the same data?" },
                  a: {
                    es: "Por ahora cada teléfono tiene sus propios datos. Para pasar la información, comparte el reporte PDF, el Excel, un trabajo con fotos, un checklist o un respaldo.",
                    en: "For now each phone has its own data. To pass information along, share the PDF report, the Excel file, a job with photos, a checklist or a backup.",
                  },
                },
                {
                  q: { es: "No me llegan los recordatorios", en: "I'm not getting reminders" },
                  a: {
                    es: "Revisa que estén activados en Más → Ajustes y que el teléfono permita notificaciones de Cana Check. Algunos teléfonos cierran las apps para ahorrar batería: quita a Cana Check de la optimización de batería.",
                    en: "Make sure they're on in More → Settings and that the phone allows Cana Check notifications. Some phones close apps to save battery: exclude Cana Check from battery optimization.",
                  },
                },
                {
                  q: { es: "¿Cómo actualizo la app?", en: "How do I update the app?" },
                  a: {
                    es: "Cuando hay una versión nueva aparece un aviso en Más. Toca «Actualizar» y luego «Instalar». No pierdes tus datos.",
                    en: "When a new version is out, a notice appears in More. Tap “Update” and then “Install”. Your data is kept.",
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export const APP_GUIDES: Record<string, AppGuide> = {
  [scanner.slug]: scanner,
  [track.slug]: track,
  [check.slug]: check,
};

export const guidePdfUrl = (slug: string, lang: string) => `/guias/${slug}-guia-${lang === "en" ? "en" : "es"}.pdf`;
