// Políticas de privacidad de las apps (/apps/<slug>/privacidad) y datos de contacto para
// pedir el borrado de la cuenta de Cana Track (/apps/cana-track/borrar-cuenta).
// Google Play y la App Store piden estas URL públicas. El texto tiene que decir exactamente
// lo que hace cada app: si cambias permisos o datos que se envían, actualízalo aquí y en
// docs/tiendas/fichas-tiendas.md (Data safety / App Privacy).

import type { GuideSection } from "./appGuides";

export const POLICY_CONTACT = {
  whatsapp: "18092102773",
  whatsappLabel: "+1 (809) 210-2773",
  email: "michael@canaescapes.com",
  company: "Cana Escapes",
  rnc: "133-70382-3",
  address: { es: "Punta Cana, República Dominicana", en: "Punta Cana, Dominican Republic" },
};

export interface AppPolicy {
  slug: string;
  updated: string; // ISO, fecha de la última versión del texto
  intro: { es: string; en: string };
  sections: GuideSection[];
}

const contactSection = (extra?: { es: string; en: string }): GuideSection => ({
  id: "contacto",
  emoji: "✉️",
  title: { es: "Contacto", en: "Contact" },
  blocks: [
    {
      type: "p",
      text: {
        es: `Responsable: ${POLICY_CONTACT.company} (RNC ${POLICY_CONTACT.rnc}), ${POLICY_CONTACT.address.es}. Para cualquier pregunta sobre esta política o sobre tus datos, escríbenos por WhatsApp al ${POLICY_CONTACT.whatsappLabel} o al correo ${POLICY_CONTACT.email}.${extra ? " " + extra.es : ""}`,
        en: `Controller: ${POLICY_CONTACT.company} (RNC ${POLICY_CONTACT.rnc}), ${POLICY_CONTACT.address.en}. For any question about this policy or your data, message us on WhatsApp at ${POLICY_CONTACT.whatsappLabel} or email ${POLICY_CONTACT.email}.${extra ? " " + extra.en : ""}`,
      },
    },
  ],
});

const changesSection: GuideSection = {
  id: "cambios",
  emoji: "📝",
  title: { es: "Cambios a esta política", en: "Changes to this policy" },
  blocks: [
    {
      type: "p",
      text: {
        es: "Si cambiamos la forma en que la app usa tus datos, actualizaremos esta página y la fecha de arriba. Si el cambio es importante, también lo avisaremos dentro de la app.",
        en: "If we change how the app uses your data, we will update this page and the date above. If the change is significant, we will also tell you inside the app.",
      },
    },
  ],
};

const updatesBlock = (app: string) =>
  ({
    type: "p",
    text: {
      es: `Buscar actualizaciones: al abrirse, ${app} consulta en nuestro servidor cuál es la última versión publicada. Esa consulta no lleva ningún dato tuyo; como cualquier conexión a internet, el servidor ve la dirección IP del teléfono, que no guardamos asociada a ti. Si aceptas actualizar, la app descarga el instalador nuevo desde canaescapes.com.`,
      en: `Update check: when it opens, ${app} asks our server for the latest published version. That request carries none of your data; as with any internet connection, the server sees the phone's IP address, which we do not store linked to you. If you accept the update, the app downloads the new installer from canaescapes.com.`,
    },
  }) as const;

const scanner: AppPolicy = {
  slug: "cana-scanner",
  updated: "2026-10-18",
  intro: {
    es: "Cana Scanner está hecha para que tus documentos se queden contigo. No pide cuenta, no tiene publicidad y no envía tus escaneos a ningún servidor nuestro.",
    en: "Cana Scanner is built so your documents stay with you. It needs no account, has no ads and does not send your scans to any server of ours.",
  },
  sections: [
    {
      id: "resumen",
      emoji: "🔒",
      title: { es: "En resumen", en: "In short" },
      blocks: [
        {
          type: "list",
          items: {
            es: [
              "No hay cuentas ni registro: no te pedimos nombre, correo ni teléfono.",
              "Tus documentos, fotos y PDF se guardan solo en tu teléfono.",
              "El escaneo y el reconocimiento de texto (OCR) se hacen en el mismo teléfono.",
              "No hay publicidad ni herramientas de seguimiento o analítica.",
              "No vendemos ni compartimos datos con nadie.",
            ],
            en: [
              "No accounts or sign-up: we never ask for your name, email or phone number.",
              "Your documents, photos and PDFs are stored only on your phone.",
              "Scanning and text recognition (OCR) run on the phone itself.",
              "No ads and no tracking or analytics tools.",
              "We do not sell or share data with anyone.",
            ],
          },
        },
      ],
    },
    {
      id: "datos",
      emoji: "📄",
      title: { es: "Qué datos usa la app y dónde quedan", en: "What data the app uses and where it stays" },
      blocks: [
        {
          type: "p",
          text: {
            es: "Documentos escaneados: las imágenes de cada página, el PDF que generas, el texto reconocido y los nombres que les pones se guardan en el almacenamiento privado de la app en tu teléfono. Nosotros no tenemos copia ni acceso a ellos.",
            en: "Scanned documents: each page image, the PDF you create, the recognized text and the names you give them are saved in the app's private storage on your phone. We have no copy of them and no access to them.",
          },
        },
        {
          type: "p",
          text: {
            es: "Cámara: el escáner lo pone Google ML Kit, un componente de los servicios de Google Play que funciona dentro del teléfono. La app no pide permiso de cámara por su cuenta: el escáner de Google abre la cámara solo mientras escaneas.",
            en: "Camera: the scanner is Google ML Kit, a Google Play services component that runs on the phone. The app does not request camera permission itself: Google's scanner opens the camera only while you scan.",
          },
        },
        {
          type: "p",
          text: {
            es: "Reconocimiento de texto (OCR): también lo hace Google ML Kit en el teléfono, sin subir la imagen a internet.",
            en: "Text recognition (OCR): also done by Google ML Kit on the phone, without uploading the image to the internet.",
          },
        },
        {
          type: "p",
          text: {
            es: "Fotos de la galería: cuando pegas una foto (firma, sello, logo) se abre el selector de fotos de Android y la app solo recibe la foto que eliges. No pide acceso a toda tu galería.",
            en: "Gallery photos: when you paste a photo (signature, stamp, logo), Android's photo picker opens and the app only receives the photo you choose. It does not ask for access to your whole gallery.",
          },
        },
        {
          type: "p",
          text: {
            es: "Compartir: el PDF o el texto solo sale del teléfono cuando tú tocas Compartir y eliges a dónde enviarlo (WhatsApp, correo, Drive…). Desde ahí aplica la política de esa app o servicio.",
            en: "Sharing: the PDF or text only leaves the phone when you tap Share and pick where to send it (WhatsApp, email, Drive…). From then on, that app's or service's policy applies.",
          },
        },
        updatesBlock("Cana Scanner"),
      ],
    },
    {
      id: "google",
      emoji: "🧩",
      title: { es: "Componentes de Google", en: "Google components" },
      blocks: [
        {
          type: "p",
          text: {
            es: "Google ML Kit procesa las imágenes en el teléfono. Según Google, ML Kit puede enviar a Google datos técnicos de diagnóstico (modelo del teléfono, versión de Android, rendimiento y errores del componente) para mantener y mejorar el servicio. Esos datos no incluyen tus imágenes ni el texto de tus documentos. Más información en la política de privacidad de Google: policies.google.com/privacy.",
            en: "Google ML Kit processes images on the phone. According to Google, ML Kit may send Google technical diagnostic data (phone model, Android version, component performance and errors) to maintain and improve the service. That data does not include your images or your documents' text. More information in Google's privacy policy: policies.google.com/privacy.",
          },
        },
      ],
    },
    {
      id: "borrar",
      emoji: "🗑️",
      title: { es: "Cómo borrar tus datos", en: "How to delete your data" },
      blocks: [
        {
          type: "p",
          text: {
            es: "Como todo está en tu teléfono, tú decides: borra un documento desde la app y se elimina con sus páginas y su PDF. Si desinstalas la app o borras sus datos en Ajustes de Android, se elimina todo. No hay nada que pedirnos que borremos porque no guardamos nada tuyo.",
            en: "Since everything is on your phone, you are in control: delete a document in the app and it is removed together with its pages and PDF. Uninstalling the app or clearing its data in Android Settings removes everything. There is nothing to ask us to delete because we keep nothing of yours.",
          },
        },
      ],
    },
    {
      id: "menores",
      emoji: "👶",
      title: { es: "Menores de edad", en: "Children" },
      blocks: [
        {
          type: "p",
          text: {
            es: "La app es una herramienta de uso general y no está dirigida a niños. No recopilamos datos de nadie, tampoco de menores.",
            en: "The app is a general-purpose tool and is not directed at children. We collect no data from anyone, including minors.",
          },
        },
      ],
    },
    changesSection,
    contactSection(),
  ],
};

const track: AppPolicy = {
  slug: "cana-track",
  updated: "2026-10-18",
  intro: {
    es: "Cana Track sirve para que un equipo de trabajo comparta su ubicación en tiempo real con sus administradores. Aquí explicamos qué datos usa, quién los ve, cuánto tiempo los guardamos y cómo borrarlos.",
    en: "Cana Track lets a work team share its real-time location with its administrators. Here we explain what data it uses, who sees it, how long we keep it and how to delete it.",
  },
  sections: [
    {
      id: "resumen",
      emoji: "🔒",
      title: { es: "En resumen", en: "In short" },
      blocks: [
        {
          type: "list",
          items: {
            es: [
              "Tu ubicación solo se envía mientras tienes activado «Compartir ubicación». Al tocar «Dejar de compartir», se detiene.",
              "Mientras compartes, Android muestra una notificación fija «Cana Track · Compartiendo ubicación», también con la app cerrada o la pantalla apagada.",
              "La ven solo los administradores de Cana Escapes y el administrador de tu equipo.",
              "Los recorridos se borran solos a los 30 días.",
              "No hay publicidad, no vendemos datos y no los compartimos para fines comerciales.",
              "Puedes pedir que borremos tu cuenta y tus datos cuando quieras.",
            ],
            en: [
              "Your location is only sent while «Share location» is on. Tapping «Stop sharing» stops it.",
              "While you share, Android shows a persistent notification «Cana Track · Sharing location», even with the app closed or the screen off.",
              "Only Cana Escapes administrators and your team's administrator can see it.",
              "Trips are deleted automatically after 30 days.",
              "No ads, we do not sell data and we do not share it for commercial purposes.",
              "You can ask us to delete your account and data at any time.",
            ],
          },
        },
      ],
    },
    {
      id: "datos",
      emoji: "📋",
      title: { es: "Qué datos recopila", en: "What data it collects" },
      blocks: [
        {
          type: "list",
          items: {
            es: [
              "Datos de entrada: tu nombre, tu número de WhatsApp y, si lo escribes, tu vehículo (tipo y descripción, por ejemplo «Moto roja»). El administrador puede agregarte un apodo.",
              "Cuenta interna: al entrar, la app crea una cuenta con un identificador aleatorio y una clave que se guarda solo en tu teléfono para que no tengas que volver a entrar. No usa tu correo.",
              "Administradores: si creas una cuenta de administrador, además guardamos tu correo y tu contraseña (cifrada; nadie puede leerla).",
              "Ubicación precisa (GPS): mientras compartes, la app toma tu posición cada 10 segundos aproximadamente y la envía cada 10 a 25 segundos, con velocidad, dirección y precisión. Si no hay señal, guarda los puntos en el teléfono y los envía al volver la conexión.",
              "Batería: el nivel de batería y si el teléfono está cargando, para que el equipo sepa si te vas a quedar sin carga.",
              "Historial de sesiones: la hora en que empiezas y dejas de compartir y la batería al inicio y al final.",
              "Timbres: los avisos que te envía la oficina (fecha y mensaje) y si te llegaron.",
            ],
            en: [
              "Join details: your name, your WhatsApp number and, if you enter it, your vehicle (type and description, e.g. «Red motorbike»). The administrator may add a nickname.",
              "Internal account: when you join, the app creates an account with a random identifier and a key stored only on your phone so you do not have to log in again. It does not use your email.",
              "Administrators: if you create an administrator account, we also store your email and your password (encrypted; nobody can read it).",
              "Precise location (GPS): while you share, the app reads your position about every 10 seconds and sends it every 10 to 25 seconds, with speed, heading and accuracy. Without signal, it keeps the points on the phone and sends them when the connection returns.",
              "Battery: battery level and whether the phone is charging, so the team knows if you are running low.",
              "Session history: when you start and stop sharing and the battery level at the start and end.",
              "Pings: the alerts the office sends you (date and message) and whether they reached you.",
            ],
          },
        },
        {
          type: "tip",
          text: {
            es: "La app no lee tus contactos, fotos, mensajes ni archivos, y no usa la cámara ni el micrófono.",
            en: "The app does not read your contacts, photos, messages or files, and does not use the camera or microphone.",
          },
        },
      ],
    },
    {
      id: "segundo-plano",
      emoji: "📍",
      title: { es: "Ubicación en segundo plano", en: "Background location" },
      blocks: [
        {
          type: "p",
          text: {
            es: "Para que tu equipo te vea en el mapa mientras trabajas, Cana Track necesita seguir enviando tu ubicación aunque cierres la app o apagues la pantalla. Por eso pide el permiso de ubicación «Permitir todo el tiempo» y funciona como un servicio con notificación fija. Solo lo hace después de que tú tocas «Compartir ubicación», y nunca cuando no estás compartiendo.",
            en: "So your team can see you on the map while you work, Cana Track needs to keep sending your location even if you close the app or turn off the screen. That is why it asks for the «Allow all the time» location permission and runs as a service with a persistent notification. It only does this after you tap «Share location», and never when you are not sharing.",
          },
        },
        {
          type: "p",
          text: {
            es: "La app también puede pedirte que la excluyas de la optimización de batería, para que Android no detenga el envío de la ubicación mientras compartes, y usa notificaciones para avisarte cuando la oficina te envía un timbre.",
            en: "The app may also ask you to exclude it from battery optimization, so Android does not stop sending your location while you share, and it uses notifications to alert you when the office sends you a ping.",
          },
        },
      ],
    },
    {
      id: "quien",
      emoji: "👥",
      title: { es: "Quién ve tus datos", en: "Who sees your data" },
      blocks: [
        {
          type: "list",
          items: {
            es: [
              "Los administradores de Cana Escapes, en la app y en el panel web.",
              "El administrador de tu equipo, si perteneces a uno: solo ve a los usuarios de su equipo.",
              "Los demás usuarios no ven tu ubicación.",
            ],
            en: [
              "Cana Escapes administrators, in the app and on the web dashboard.",
              "Your team's administrator, if you belong to a team: they only see users in their team.",
              "Other users cannot see your location.",
            ],
          },
        },
        {
          type: "p",
          text: {
            es: "Para que el servicio funcione usamos proveedores que tratan los datos por encargo nuestro y no pueden usarlos para otros fines: Supabase (servidor y base de datos donde se guardan los datos, con conexión cifrada) y Google Maps (muestra el mapa a los administradores y convierte coordenadas en direcciones). No compartimos tus datos con nadie más, salvo que una ley o una autoridad competente nos obligue.",
            en: "To run the service we use providers that process data on our behalf and cannot use it for other purposes: Supabase (server and database where the data is stored, over an encrypted connection) and Google Maps (shows the map to administrators and turns coordinates into addresses). We do not share your data with anyone else unless a law or a competent authority requires it.",
          },
        },
        {
          type: "p",
          text: {
            es: "Cuando tocas un timbre, la app abre WhatsApp para que escribas a la oficina. Desde ahí aplica la política de WhatsApp.",
            en: "When you tap a ping, the app opens WhatsApp so you can message the office. From then on, WhatsApp's policy applies.",
          },
        },
      ],
    },
    {
      id: "uso",
      emoji: "🎯",
      title: { es: "Para qué se usan", en: "What it is used for" },
      blocks: [
        {
          type: "p",
          text: {
            es: "Solo para coordinar el trabajo del equipo: ver dónde está cada persona, su recorrido del día y su batería, llamarla con el timbre y revisar el historial de cuándo compartió. No usamos tus datos para publicidad ni para crear perfiles.",
            en: "Only to coordinate the team's work: see where each person is, their trip of the day and battery, call them with a ping and review when they shared. We do not use your data for advertising or profiling.",
          },
        },
        updatesBlock("Cana Track"),
      ],
    },
    {
      id: "conservacion",
      emoji: "⏱️",
      title: { es: "Cuánto tiempo los guardamos", en: "How long we keep it" },
      blocks: [
        {
          type: "list",
          items: {
            es: [
              "Puntos del recorrido: 30 días; después se borran automáticamente.",
              "Última ubicación conocida, batería, historial de sesiones y timbres: mientras tu cuenta exista.",
              "Nombre, WhatsApp y vehículo: mientras tu cuenta exista.",
              "Al borrar la cuenta se elimina todo lo anterior.",
            ],
            en: [
              "Trip points: 30 days; then they are deleted automatically.",
              "Last known location, battery, session history and pings: while your account exists.",
              "Name, WhatsApp and vehicle: while your account exists.",
              "Deleting the account removes all of the above.",
            ],
          },
        },
      ],
    },
    {
      id: "borrar",
      emoji: "🗑️",
      title: { es: "Cómo borrar tu cuenta y tus datos", en: "How to delete your account and data" },
      blocks: [
        {
          type: "p",
          text: {
            es: "Puedes pedir que borremos tu cuenta y todos tus datos en cualquier momento, aunque ya no tengas la app. Sigue los pasos de canaescapes.com/apps/cana-track/borrar-cuenta o escríbenos por WhatsApp o correo. Si solo quieres dejar de enviar tu ubicación, toca «Dejar de compartir» o quita el permiso de ubicación en Ajustes de Android.",
            en: "You can ask us to delete your account and all your data at any time, even if you no longer have the app. Follow the steps at canaescapes.com/apps/cana-track/borrar-cuenta or message us on WhatsApp or by email. If you only want to stop sending your location, tap «Stop sharing» or remove the location permission in Android Settings.",
          },
        },
        {
          type: "p",
          text: {
            es: "También puedes pedirnos una copia de tus datos o que corrijamos algo que esté mal.",
            en: "You can also ask us for a copy of your data or to correct anything that is wrong.",
          },
        },
      ],
    },
    {
      id: "seguridad",
      emoji: "🛡️",
      title: { es: "Seguridad", en: "Security" },
      blocks: [
        {
          type: "p",
          text: {
            es: "Los datos viajan cifrados (HTTPS) y la base de datos tiene reglas de acceso para que cada persona vea solo lo que le corresponde. Ningún sistema es 100 % seguro, pero revisamos estas reglas y limitamos el acceso a los administradores.",
            en: "Data travels encrypted (HTTPS) and the database has access rules so each person only sees what they are allowed to. No system is 100% secure, but we review these rules and limit access to administrators.",
          },
        },
      ],
    },
    {
      id: "menores",
      emoji: "👶",
      title: { es: "Menores de edad", en: "Children" },
      blocks: [
        {
          type: "p",
          text: {
            es: "Cana Track es una herramienta de trabajo para personas mayores de 18 años y no está dirigida a niños.",
            en: "Cana Track is a work tool for people aged 18 and over and is not directed at children.",
          },
        },
      ],
    },
    changesSection,
    contactSection(),
  ],
};

const check: AppPolicy = {
  slug: "cana-check",
  updated: "2026-10-27",
  intro: {
    es: "Cana Check guarda el récord de mantenimiento de tus propiedades en tu teléfono. No pide cuenta, no tiene publicidad y no envía tus datos ni tus fotos a ningún servidor nuestro.",
    en: "Cana Check keeps your properties' maintenance record on your phone. It needs no account, has no ads and does not send your data or photos to any server of ours.",
  },
  sections: [
    {
      id: "resumen",
      emoji: "🔒",
      title: { es: "En resumen", en: "In short" },
      blocks: [
        {
          type: "list",
          items: {
            es: [
              "No hay cuentas ni registro. El nombre que escribes al empezar solo se usa dentro de la app.",
              "Tus propiedades, trabajos, días de ocupación y fotos se guardan solo en tu teléfono.",
              "Los recordatorios los programa el mismo teléfono; no pasan por ningún servidor.",
              "No hay publicidad ni herramientas de seguimiento o analítica.",
              "No vendemos ni compartimos datos con nadie.",
            ],
            en: [
              "No accounts or sign-up. The name you type at the start is only used inside the app.",
              "Your properties, jobs, occupancy days and photos are stored only on your phone.",
              "Reminders are scheduled by the phone itself; they don't go through any server.",
              "No ads and no tracking or analytics tools.",
              "We do not sell or share data with anyone.",
            ],
          },
        },
      ],
    },
    {
      id: "datos",
      emoji: "📄",
      title: { es: "Qué datos usa la app y dónde quedan", en: "What data the app uses and where it stays" },
      blocks: [
        {
          type: "p",
          text: {
            es: "Datos de mantenimiento: las propiedades (nombre, tipo, ubicación, propietario y equipos), los días de ocupación, los trabajos (fechas, a quién se asignaron, quién los hizo, costos y notas) se guardan en el almacenamiento privado de la app en tu teléfono. Nosotros no tenemos copia ni acceso a ellos.",
            en: "Maintenance data: properties (name, type, location, owner and equipment), occupancy days and jobs (dates, who they were assigned to, who did them, costs and notes) are saved in the app's private storage on your phone. We have no copy of them and no access to them.",
          },
        },
        {
          type: "p",
          text: {
            es: "Cámara y fotos: la app pide permiso de cámara solo para tomar fotos de los trabajos. Si eliges una foto de la galería, se abre el selector de fotos de Android y la app solo recibe la foto que escoges. Las fotos se guardan reducidas dentro de la app.",
            en: "Camera and photos: the app asks for camera permission only to take photos of jobs. If you pick a photo from the gallery, Android's photo picker opens and the app only receives the photo you choose. Photos are stored, resized, inside the app.",
          },
        },
        {
          type: "p",
          text: {
            es: "Notificaciones: la app pide permiso para mostrar recordatorios. Se programan en el teléfono con tus propios datos.",
            en: "Notifications: the app asks permission to show reminders. They are scheduled on the phone using your own data.",
          },
        },
        {
          type: "p",
          text: {
            es: "Compartir y respaldos: el reporte PDF, las tablas de Excel, el resumen de un trabajo o el respaldo solo salen del teléfono cuando tú tocas Compartir y eliges a dónde enviarlos (WhatsApp, correo, Drive…). Desde ahí aplica la política de esa app o servicio. El botón «¿Necesitas un técnico?» abre WhatsApp con un mensaje que tú decides si envías.",
            en: "Sharing and backups: the PDF report, Excel tables, a job summary or a backup only leave the phone when you tap Share and pick where to send them (WhatsApp, email, Drive…). From then on, that app's or service's policy applies. The “Need a technician?” button opens WhatsApp with a message you decide whether to send.",
          },
        },
        updatesBlock("Cana Check"),
      ],
    },
    {
      id: "borrar",
      emoji: "🗑️",
      title: { es: "Cómo borrar tus datos", en: "How to delete your data" },
      blocks: [
        {
          type: "p",
          text: {
            es: "Todo está en tu teléfono: puedes borrar trabajos, fotos o propiedades desde la app, o todo a la vez en Más → «Borrar todos los datos». Si desinstalas la app o borras sus datos en Ajustes de Android, se elimina todo. No hay nada que pedirnos que borremos porque no guardamos nada tuyo.",
            en: "Everything is on your phone: you can delete jobs, photos or properties in the app, or everything at once in More → “Delete all data”. Uninstalling the app or clearing its data in Android Settings removes everything. There is nothing to ask us to delete because we keep nothing of yours.",
          },
        },
      ],
    },
    {
      id: "menores",
      emoji: "👶",
      title: { es: "Menores de edad", en: "Children" },
      blocks: [
        {
          type: "p",
          text: {
            es: "La app es una herramienta de trabajo y no está dirigida a niños. No recopilamos datos de nadie, tampoco de menores.",
            en: "The app is a work tool and is not directed at children. We collect no data from anyone, including minors.",
          },
        },
      ],
    },
    changesSection,
    contactSection(),
  ],
};

export const APP_POLICIES: Record<string, AppPolicy> = {
  [scanner.slug]: scanner,
  [track.slug]: track,
  [check.slug]: check,
};
