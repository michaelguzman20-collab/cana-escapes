# Fichas para Google Play y App Store — Cana Scanner y Cana Track

Borradores preparados el 2026-10-18, antes de abrir las cuentas de desarrollador (Play: 25 USD una
vez; Apple: 99 USD al año). Están hechos a partir del código de las apps en ese momento
(Cana Scanner v1.2.0, Cana Track v1.2.2). **Si cambian los permisos o los datos que se envían,
actualiza este documento y `src/content/appPolicies.ts`**: las respuestas de Data safety / App
Privacy tienen que coincidir con la política publicada.

## URLs públicas (ya en el sitio)

| Para qué | Cana Scanner | Cana Track |
|---|---|---|
| Política de privacidad (obligatoria en ambas tiendas) | https://canaescapes.com/apps/cana-scanner/privacidad | https://canaescapes.com/apps/cana-track/privacidad |
| Borrar cuenta y datos (Play "Delete account URL"; Apple la pide además dentro de la app) | — (no tiene cuentas) | https://canaescapes.com/apps/cana-track/borrar-cuenta |
| Guía / URL de soporte (Apple "Support URL") | https://canaescapes.com/apps/cana-scanner/guia | https://canaescapes.com/apps/cana-track/guia |
| Sitio web / marketing | https://canaescapes.com/apps | https://canaescapes.com/apps |

Versión en inglés de cualquier página: agregar `?lang=en` (por ejemplo `.../privacidad?lang=en`).

Datos del desarrollador: Cana Escapes · RNC 133-70382-3 · Punta Cana, República Dominicana ·
michael@canaescapes.com · WhatsApp +1 (809) 210-2773.

---

## 1. Cana Scanner (`com.canaescapes.scanner`)

### Ficha de Google Play

- **Nombre** (≤30): `Cana Scanner`
- **Categoría:** Productividad · **Etiquetas:** escáner, PDF, documentos
- **Descripción corta** (≤80):
  - ES: `Escanea documentos a PDF, edítalos y copia su texto. Sin cuentas ni anuncios.` (77)
  - EN: `Scan documents to PDF, edit them and copy their text. No account, no ads.` (73)

**Descripción completa — ES** (≈1.300 de 4.000 caracteres)

```
Cana Scanner convierte la cámara de tu teléfono en un escáner de documentos. Detecta los bordes, recorta y endereza cada página, reconoce el texto y crea un PDF listo para enviar por WhatsApp, correo o Drive.

QUÉ PUEDES HACER
• Escanear documentos de una o varias páginas (hasta 30 por escaneo).
• Detección automática de bordes y recorte.
• Editar: escribir con lápiz, resaltar, borrar y pegar fotos como una firma, un sello o un logo.
• Agregar, quitar y reordenar páginas.
• Copiar el texto del documento con reconocimiento de texto (OCR). El PDF también lleva el texto seleccionable.
• Compartir el PDF o el texto con cualquier app.

TUS DOCUMENTOS SE QUEDAN CONTIGO
• No necesitas cuenta ni registrarte.
• Los documentos se guardan solo en tu teléfono.
• El escaneo y el reconocimiento de texto se hacen en el propio teléfono con Google ML Kit.
• Sin publicidad y sin herramientas de seguimiento.

IDEAL PARA
Contratos, facturas, recibos, cédulas y pasaportes para registros, formularios firmados, notas y cualquier papel que necesites enviar rápido.

Hecha por Cana Escapes en Punta Cana, República Dominicana.
Guía de uso: canaescapes.com/apps/cana-scanner/guia
```

**Descripción completa — EN**

```
Cana Scanner turns your phone camera into a document scanner. It detects the edges, crops and straightens each page, recognizes the text and creates a PDF ready to send via WhatsApp, email or Drive.

WHAT YOU CAN DO
• Scan one- or multi-page documents (up to 30 pages per scan).
• Automatic edge detection and cropping.
• Edit: write with a pen, highlight, erase and paste photos such as a signature, stamp or logo.
• Add, remove and reorder pages.
• Copy the document's text with text recognition (OCR). The PDF also carries selectable text.
• Share the PDF or the text with any app.

YOUR DOCUMENTS STAY WITH YOU
• No account or sign-up needed.
• Documents are stored only on your phone.
• Scanning and text recognition run on the phone itself with Google ML Kit.
• No ads and no tracking tools.

GREAT FOR
Contracts, invoices, receipts, IDs and passports for check-ins, signed forms, notes and any paper you need to send fast.

Made by Cana Escapes in Punta Cana, Dominican Republic.
User guide: canaescapes.com/apps/cana-scanner/guia
```

### Ficha de la App Store (cuando exista versión iOS)

- **Nombre** (≤30): `Cana Scanner`
- **Subtítulo** (≤30): ES `Escáner de documentos a PDF` (27) · EN `Document scanner to PDF` (23)
- **Palabras clave** (≤100, separadas por comas, sin espacios):
  ES `escaner,pdf,documentos,ocr,texto,firma,recibos,facturas,escanear,camara`
  EN `scanner,pdf,document,ocr,text,sign,receipt,invoice,scan,camera`
- **Texto promocional** (≤170): ES `Escanea, edita y comparte tus documentos en PDF. Todo se queda en tu teléfono: sin cuentas y sin anuncios.`
- **Categoría:** Productividad (secundaria: Empresa)
- **Descripción:** la misma de Play.
- **Nota técnica:** en iOS no existe Google ML Kit Document Scanner; habría que usar VisionKit
  (escáner de Apple) y Vision para el OCR, y revisar estas respuestas.

### Google Play — Data safety (formulario «Seguridad de los datos»)

| Pregunta | Respuesta propuesta |
|---|---|
| ¿Tu app recopila o comparte alguno de los tipos de datos de usuario obligatorios? | **Sí**, solo por el SDK de Google ML Kit (ver abajo). Si al revisar la página de Google se confirma que ML Kit no envía nada que haya que declarar, la respuesta sería **No**. |
| ¿Todos los datos se encriptan en tránsito? | Sí |
| ¿Ofreces una forma de pedir que se borren los datos? | No hace falta: no hay cuentas y no guardamos datos. Los documentos se borran en la app o al desinstalarla. |
| Tipos de datos | **Información y rendimiento de la app → Diagnósticos** (y **Registros de fallos** si la página de ML Kit lo indica): *Recopilado* sí · *Compartido* no · Procesado de forma efímera: no · Obligatorio (el usuario no lo puede desactivar) · Finalidad: **Funcionalidad de la app / Analítica** (la que diga Google para ML Kit). |
| Fotos, archivos y documentos | **No se declaran**: se procesan solo en el teléfono y no salen de él salvo que el usuario los comparta. Lo que se procesa solo en el dispositivo no cuenta como "recopilado". |
| Ubicación, información personal, mensajes, contactos, identificadores | No |

> Antes de enviar: verificar en https://developers.google.com/ml-kit/android-data-disclosure qué
> datos declara Google para *Document Scanner* y *Text Recognition v2* y copiar exactamente esas
> categorías y finalidades.

### Apple — App Privacy («Etiquetas de privacidad»)

- **Data Not Collected / Datos no recopilados.** En iOS se usaría VisionKit/Vision (de Apple, en el
  dispositivo), que no envía datos al desarrollador. No hay seguimiento (tracking): **No**.

### Otros formularios

- **Clasificación de contenido (IARC):** categoría *Utilidad/Productividad*; todas las respuestas
  "No" (sin violencia, sexo, lenguaje, drogas, apuestas; sin interacción entre usuarios; no comparte
  ubicación; no permite compras). Resultado esperado: *Para todos / 3+ / 4+*.
- **Público objetivo:** 18+ (evita el programa de familias; la app no está dirigida a niños).
- **Anuncios:** No contiene anuncios.
- **Acceso a la app:** toda la funcionalidad está disponible sin cuenta.

### Cambios pendientes en la app antes de la tienda (todavía no se tocan)

- Quitar la autoactualización (descarga del APK) y el permiso `REQUEST_INSTALL_PACKAGES` en la
  versión de tienda: Play prohíbe que una app se actualice fuera de Play.
- Quitar del manifiesto permisos que no usa: `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`
  (Expo los agrega; se bloquean con `android.blockedPermissions` en `app.json`).
- Generar **AAB** firmado (Play App Signing con la llave actual como *upload key*).
- Capturas: 2–8 de teléfono (escanear, lista de documentos, editor, texto copiado) + gráfico de
  funciones 1024×500 + icono 512×512 (ya está en `public/apps/cana-scanner.png`).

---

## 2. Cana Track (`com.canaescapes.track`)

### Ficha de Google Play

- **Nombre** (≤30): `Cana Track`
- **Categoría:** Empresa (Business)
- **Descripción corta** (≤80):
  - ES: `Comparte la ubicación de tu equipo en tiempo real. Entra con nombre y WhatsApp.` (79)
  - EN: `Share your team's live location in real time. Join with name and WhatsApp.` (74)

**Descripción completa — ES**

```
Cana Track muestra en un mapa, en tiempo real, dónde está cada persona de tu equipo de trabajo. Ideal para transporte, mensajería en moto, mantenimiento y negocios con personal en la calle.

PARA LOS USUARIOS
• Entra solo con tu nombre y tu WhatsApp, sin correo ni contraseña.
• Elige tu vehículo: moto, carro, minivan, a pie…
• Un toque para «Compartir ubicación» y otro para «Dejar de compartir».
• Mientras compartes verás una notificación fija: siempre sabes cuándo se está enviando tu ubicación.
• Si la oficina te llama con el timbre, te llega un aviso y con un toque le escribes por WhatsApp.
• Si te quedas sin señal, la app guarda los puntos y los envía cuando vuelve la conexión.

PARA LOS ADMINISTRADORES
• Mapa en vivo con el recorrido del día, la batería y el estado de cada persona.
• Vista satélite y tráfico.
• Timbre para pedirle a alguien que escriba por WhatsApp.
• Historial de cuándo empezó y dejó de compartir cada usuario.
• Equipos: cada administrador ve solo a su gente. También desde el panel web.

PRIVACIDAD
• La ubicación solo se envía mientras el usuario tiene activado «Compartir ubicación».
• Solo la ven los administradores del equipo.
• Los recorridos se borran solos a los 30 días.
• Sin publicidad. Puedes pedir que se borre tu cuenta cuando quieras.

Cana Track usa la ubicación en segundo plano para seguir compartiendo tu posición con tu equipo aunque cierres la app o apagues la pantalla, solo mientras tú lo tengas activado.

Hecha por Cana Escapes en Punta Cana, República Dominicana.
Guía de uso: canaescapes.com/apps/cana-track/guia
```

**Descripción completa — EN**

```
Cana Track shows on a map, in real time, where each person on your work team is. Great for transport, motorbike delivery, maintenance and businesses with staff on the move.

FOR USERS
• Join with just your name and WhatsApp, no email or password.
• Pick your vehicle: motorbike, car, minivan, on foot…
• One tap to «Share location» and another to «Stop sharing».
• While sharing you see a persistent notification, so you always know when your location is being sent.
• If the office rings you, you get an alert and can message them on WhatsApp with one tap.
• No signal? The app keeps the points and sends them when the connection is back.

FOR ADMINISTRATORS
• Live map with each person's trip of the day, battery and status.
• Satellite view and traffic.
• Ping someone to ask them to message on WhatsApp.
• History of when each user started and stopped sharing.
• Teams: each administrator only sees their own people. Also on the web dashboard.

PRIVACY
• Location is only sent while the user has «Share location» turned on.
• Only the team's administrators can see it.
• Trips are deleted automatically after 30 days.
• No ads. You can ask for your account to be deleted at any time.

Cana Track uses background location to keep sharing your position with your team even when the app is closed or the screen is off, only while you have sharing turned on.

Made by Cana Escapes in Punta Cana, Dominican Republic.
User guide: canaescapes.com/apps/cana-track/guia
```

### Ficha de la App Store (cuando exista versión iOS)

- **Nombre:** `Cana Track`
- **Subtítulo** (≤30): ES `Ubicación de tu equipo en vivo` (30) · EN `Your team's live location` (25)
- **Palabras clave:**
  ES `ubicacion,equipo,gps,flota,mensajeria,moto,rastreo,mapa,choferes,whatsapp`
  EN `location,team,gps,fleet,courier,tracking,map,drivers,dispatch,whatsapp`
- **Texto promocional:** ES `Mira en un mapa dónde está tu equipo, su batería y su recorrido del día. Los usuarios entran solo con nombre y WhatsApp.`
- **Categoría:** Empresa (secundaria: Navegación)
- **Cuenta de prueba para App Review:** crear un administrador de demostración con usuarios de
  prueba compartiendo ubicación; Apple exige credenciales que funcionen.

### Google Play — Data safety

Preguntas generales:

| Pregunta | Respuesta |
|---|---|
| ¿Recopila o comparte datos de usuario? | **Sí** |
| ¿Todos los datos se encriptan en tránsito? | **Sí** (HTTPS a Supabase) |
| ¿Ofreces una forma de pedir que se borren los datos? | **Sí** → https://canaescapes.com/apps/cana-track/borrar-cuenta |
| ¿La app permite crear una cuenta? | **Sí** (cuenta interna creada al entrar con nombre + WhatsApp; administradores con correo + contraseña) |
| URL para borrar la cuenta | https://canaescapes.com/apps/cana-track/borrar-cuenta |

Tipos de datos (ninguno se **comparte**: Supabase y Google Maps son proveedores de servicio que
tratan los datos por encargo, y Play no lo considera "compartir"):

| Categoría Play → tipo | Recopilado | Obligatorio | Finalidad | Notas |
|---|---|---|---|---|
| Ubicación → **Ubicación precisa** | Sí | Obligatorio para usar la función | Funcionalidad de la app | Solo mientras «Compartir ubicación» está activo; recorridos 30 días |
| Ubicación → Ubicación aproximada | Sí | Obligatorio | Funcionalidad de la app | Android concede ambas (`ACCESS_COARSE_LOCATION` está en el manifiesto) |
| Información personal → **Nombre** | Sí | Obligatorio | Funcionalidad de la app, Administración de la cuenta | |
| Información personal → **Número de teléfono** | Sí | Obligatorio | Funcionalidad de la app, Administración de la cuenta | WhatsApp |
| Información personal → **Dirección de correo** | Sí | Obligatorio solo para administradores | Administración de la cuenta | Los usuarios normales no dan correo |
| Información personal → **ID de usuario** | Sí | Obligatorio | Administración de la cuenta | Identificador interno aleatorio |
| Información personal → Otra información | Sí | Opcional | Funcionalidad de la app | Vehículo (tipo y descripción) y apodo |
| Mensajes → **Otros mensajes en la app** | Sí | Obligatorio | Funcionalidad de la app | Timbres de la oficina (fecha y texto) |
| Información y rendimiento de la app → **Otros datos de rendimiento** | Sí | Obligatorio | Funcionalidad de la app | Nivel de batería y si está cargando. No hay categoría "batería"; se declara aquí por prudencia |
| Actividad en la app → Otras acciones | Sí | Obligatorio | Funcionalidad de la app | Historial de sesiones (hora de inicio/fin de compartir) |

No se recopilan: contactos, fotos, archivos, audio, calendario, historial web, información
financiera, de salud, identificadores de dispositivo ni publicidad.

### Apple — App Privacy

- **Tracking (seguimiento entre apps/sitios):** No.
- **Data Linked to You / Datos vinculados a ti** (todos con finalidad *App Functionality*; Apple
  no tiene una finalidad "administración de cuenta", así que no se marca nada más):
  - Location → **Precise Location**
  - Contact Info → **Name**, **Phone Number**, **Email Address** (solo administradores)
  - Identifiers → **User ID**
  - User Content → **Other User Content** (timbres)
  - Usage Data → **Product Interaction** (historial de sesiones)
  - Other Data → **Other Data Types** (batería, vehículo)
- **Data Not Linked to You:** ninguno.

### Justificación de la ubicación en segundo plano

**Google Play — Declaración de permisos (Ubicación en segundo plano)**

*Función principal que usa la ubicación en segundo plano:*

> Cana Track es una app de coordinación para equipos de trabajo (transporte, mensajería en moto,
> mantenimiento). Cuando el usuario toca «Compartir ubicación», la app envía su ubicación cada
> 10–25 segundos a los administradores de su equipo, que lo ven en un mapa en vivo con su
> recorrido y su batería para asignarle trabajos y avisarle con el timbre. El usuario trabaja en
> la calle con la pantalla apagada o usando otras apps (WhatsApp, mapas), por eso la ubicación
> debe seguir enviándose en segundo plano. Solo ocurre mientras el usuario lo tiene activado; al
> tocar «Dejar de compartir» se detiene. Mientras está activo se muestra una notificación fija
> de servicio en primer plano «Cana Track · Compartiendo ubicación».

*EN (Play pide la declaración en inglés si la consola está en inglés):*

> Cana Track is a coordination app for work teams (transport, motorbike couriers, maintenance).
> When the user taps «Share location», the app sends their location every 10–25 seconds to their
> team's administrators, who see them on a live map with their route and battery level to dispatch
> jobs and ping them. Users work on the street with the screen off or while using other apps
> (WhatsApp, maps), so location must keep being sent in the background. This only happens while the
> user has sharing turned on; tapping «Stop sharing» stops it. While active, a persistent
> foreground-service notification «Cana Track · Sharing location» is shown.

*Video de demostración* (Play lo exige, ≤30 s, enlace de YouTube no listado): abrir la app →
tocar «Compartir ubicación» → aviso de ubicación → permiso «Permitir todo el tiempo» → notificación
fija → apagar la pantalla → el administrador ve el punto moverse → «Dejar de compartir».

**Declaración de servicio en primer plano (Play, tipo `location`):** "El servicio en primer plano de
ubicación mantiene el envío de la ubicación mientras el usuario comparte; lo inicia el usuario con
«Compartir ubicación» y se detiene con «Dejar de compartir»; muestra una notificación persistente."

**Apple — textos de permiso (`Info.plist`, cuando se haga la versión iOS)**

- `NSLocationWhenInUseUsageDescription`: «Cana Track usa tu ubicación para mostrarla a los
  administradores de tu equipo mientras compartes.»
- `NSLocationAlwaysAndWhenInUseUsageDescription`: «Para seguir compartiendo tu ubicación con tu
  equipo aunque cierres la app o bloquees el teléfono. Solo se envía mientras tienes activado
  "Compartir ubicación".»
- `UIBackgroundModes`: `location`. En App Review explicar lo mismo que en Play (guía 2.5.4: el
  uso en segundo plano debe ser para la función principal de la app).

### Otros formularios

- **Clasificación de contenido (IARC):** categoría *Utilidad/Productividad*. "¿Comparte la
  ubicación del usuario con otros usuarios?" → **Sí** (la ven los administradores). Lo demás "No".
  Resultado esperado: *Para todos / 3+* con aviso de "Comparte ubicación".
- **Público objetivo:** 18+ (herramienta de trabajo).
- **Anuncios:** No.
- **Acceso a la app (Play):** dar instrucciones y un número de prueba: "Entrar con nombre `Revisor
  Google` y WhatsApp `+1 809 000 0000`; para ver el mapa de administrador usar el correo/contraseña
  de demostración". Crear esas cuentas antes de enviar.
- **App de empresa / uso interno:** si solo la usará el equipo de Cana Escapes, Play permite
  publicarla como app privada (Managed Google Play), que no pasa por la revisión pública de
  ubicación en segundo plano. Evaluarlo.

### Cambios pendientes en la app antes de la tienda (todavía no se tocan)

1. **Borrar la cuenta desde la app** (Apple lo exige dentro de la app — guía 5.1.1(v); Play acepta
   el enlace web pero también pide la opción en la app): agregar en Ajustes «Borrar mi cuenta» que
   llame a una función tipo `fleet-delete` para el propio usuario y luego cierre la sesión.
2. **Aviso destacado (prominent disclosure)** *antes* del primer permiso de ubicación (hoy el
   aviso sale después del permiso de primer plano). Play exige que el texto diga, más o menos:
   «Cana Track recopila datos de ubicación para mostrar tu posición a los administradores de tu
   equipo, incluso cuando la app está cerrada o no está en uso, mientras tengas activado
   "Compartir ubicación".» con botones Aceptar / No, gracias.
3. Quitar la autoactualización por APK y el permiso `REQUEST_INSTALL_PACKAGES`.
4. Quitar permisos que no usa: `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`
   (`android.blockedPermissions`).
5. `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`: Play lo permite solo en casos aceptables; justificarlo
   como "servicio de ubicación que el usuario activa y que Android cierra en algunos fabricantes"
   o cambiarlo por abrir la pantalla de ajustes de batería sin pedir la exención directa.
6. Generar **AAB**; cuenta personal de Play → prueba cerrada con 12 testers durante 14 días.

---

## Pendientes de decisión del dueño

- Confirmar los plazos que promete la página de borrado: **7 días** para borrar y **90 días** como
  máximo en respaldos (depende de cuánto tiempo se guardan las copias de `backup-completo.mjs`).
- Confirmar que el correo de contacto público para privacidad sea `michael@canaescapes.com` (o
  crear uno tipo `privacidad@canaescapes.com`).
- Revisar la página de divulgación de datos de ML Kit para cerrar la respuesta de Data safety de
  Cana Scanner.
