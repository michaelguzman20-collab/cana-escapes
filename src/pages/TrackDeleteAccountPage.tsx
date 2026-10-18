import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail, MessageCircle, ShieldCheck, UserX } from "lucide-react";
import { LangProvider, useLang } from "@/lib/LangContext";
import { useSeo } from "@/lib/useSeo";
import { LandingNavbar } from "@/components/cana/LandingNavbar";
import { LandingFooter } from "@/components/cana/LandingFooter";
import { GuideBlockView } from "@/components/cana/GuideBlockView";
import { APP_GUIDES } from "@/content/appGuides";
import { POLICY_CONTACT } from "@/content/appPolicies";

// Página pública para pedir el borrado de la cuenta de Cana Track (Google Play y la App Store
// exigen un enlace así porque la app crea cuentas). Por ahora el borrado lo hace un administrador
// a mano con la función fleet-delete, que elimina al usuario y en cascada sus posiciones,
// recorridos, sesiones y timbres.

type Lang = "es" | "en";

const UI = {
  es: {
    badge: "Borrar cuenta y datos",
    title: "Borrar tu cuenta de Cana Track",
    intro:
      "Puedes pedir que borremos tu cuenta de Cana Track y todos los datos asociados en cualquier momento, aunque ya no tengas la app instalada.",
    back: "Todas las apps",
    howTitle: "Cómo pedirlo",
    steps: [
      "Escríbenos por WhatsApp o por correo con los botones de abajo.",
      "Indica el nombre y el número de WhatsApp con los que entraste a la app (o tu correo, si eres administrador de un equipo).",
      "Para proteger tu cuenta, confirmaremos que eres tú: lo más fácil es escribir desde el mismo WhatsApp que usaste en la app.",
      "Borramos la cuenta y los datos en un máximo de 7 días y te avisamos cuando esté hecho.",
    ],
    whatsapp: "Pedir por WhatsApp",
    email: "Pedir por correo",
    waText: "Hola, quiero borrar mi cuenta de Cana Track y mis datos. Mi nombre en la app es: ",
    mailSubject: "Borrar mi cuenta de Cana Track",
    mailBody:
      "Hola, quiero borrar mi cuenta de Cana Track y todos mis datos.\n\nNombre en la app:\nNúmero de WhatsApp usado en la app:\n",
    deletedTitle: "Qué se borra",
    deleted: [
      "Tu cuenta y su clave de acceso.",
      "Tu nombre, número de WhatsApp, vehículo y apodo.",
      "Tu última ubicación y todos tus recorridos guardados.",
      "Tu nivel de batería y tu historial de sesiones.",
      "Los timbres que te enviaron.",
      "Si eres administrador de un equipo: también tu correo. Los usuarios de tu equipo no se borran; pasan al administrador principal.",
    ],
    keptTitle: "Qué se conserva",
    kept:
      "Nada de lo anterior se sigue usando. Puede quedar una copia en los respaldos de seguridad del servidor hasta que se reemplacen, en un máximo de 90 días, y después desaparece. Solo guardaremos algo más si una ley nos obliga.",
    stopTip:
      "¿Solo quieres que no se vea tu ubicación? Toca «Dejar de compartir» en la app o quita el permiso de ubicación en Ajustes de Android. Eso no borra tu cuenta.",
    privacy: "Política de privacidad",
  },
  en: {
    badge: "Delete account and data",
    title: "Delete your Cana Track account",
    intro:
      "You can ask us to delete your Cana Track account and all associated data at any time, even if you no longer have the app installed.",
    back: "All apps",
    howTitle: "How to request it",
    steps: [
      "Message us on WhatsApp or by email using the buttons below.",
      "Tell us the name and WhatsApp number you used to join the app (or your email, if you are a team administrator).",
      "To protect your account, we will confirm it is you: the easiest way is to message us from the same WhatsApp number you used in the app.",
      "We delete the account and data within 7 days and let you know when it is done.",
    ],
    whatsapp: "Request on WhatsApp",
    email: "Request by email",
    waText: "Hi, I want to delete my Cana Track account and my data. My name in the app is: ",
    mailSubject: "Delete my Cana Track account",
    mailBody:
      "Hi, I want to delete my Cana Track account and all my data.\n\nName in the app:\nWhatsApp number used in the app:\n",
    deletedTitle: "What is deleted",
    deleted: [
      "Your account and its access key.",
      "Your name, WhatsApp number, vehicle and nickname.",
      "Your last location and all your saved trips.",
      "Your battery level and session history.",
      "The pings sent to you.",
      "If you are a team administrator: your email too. Your team's users are not deleted; they move to the main administrator.",
    ],
    keptTitle: "What is kept",
    kept:
      "None of the above is used any more. A copy may remain in the server's security backups until they are replaced, for up to 90 days, and then it is gone. We only keep anything else if a law requires it.",
    stopTip:
      "Just want your location hidden? Tap «Stop sharing» in the app or remove the location permission in Android Settings. That does not delete your account.",
    privacy: "Privacy policy",
  },
};

function DeleteContent() {
  const { lang, setLang } = useLang();
  const l: Lang = lang === "en" ? "en" : "es";
  const ui = UI[l];
  const app = APP_GUIDES["cana-track"];

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("lang");
    if (forced === "es" || forced === "en") setLang(forced);
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const waHref = `https://wa.me/${POLICY_CONTACT.whatsapp}?text=${encodeURIComponent(ui.waText)}`;
  const mailHref = `mailto:${POLICY_CONTACT.email}?subject=${encodeURIComponent(ui.mailSubject)}&body=${encodeURIComponent(ui.mailBody)}`;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <LandingNavbar />

      <header className="bg-[#0F2B4C] pt-28 pb-20 sm:pt-36 sm:pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Link to="/apps" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
            <ArrowLeft size={15} />
            {ui.back}
          </Link>
          <div className="mt-6 flex items-center gap-4 sm:gap-5">
            <img src={app.icon} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-md flex-shrink-0" />
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[#F0A030] text-xs font-semibold uppercase tracking-[0.18em]">
                <UserX size={14} />
                {ui.badge}
              </span>
              <h1 className="mt-1 text-3xl sm:text-4xl font-serif font-bold text-white">{ui.title}</h1>
            </div>
          </div>
          <p className="mt-5 text-lg text-white/70 leading-relaxed">{ui.intro}</p>
        </div>
      </header>

      <main className="-mt-10 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
          <section className="rounded-3xl bg-white border border-[#0F2B4C]/10 shadow-xl shadow-[#0F2B4C]/5 p-5 sm:p-7">
            <h2 className="text-xl font-serif font-bold text-[#0F2B4C]">{ui.howTitle}</h2>
            <div className="mt-4">
              <GuideBlockView block={{ type: "steps", items: { es: UI.es.steps, en: UI.en.steps } }} l={l} />
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-[#0F2B4C] bg-[#F0A030] hover:bg-[#e5952a] rounded-xl transition-colors shadow-lg shadow-[#F0A030]/25"
              >
                <MessageCircle size={18} />
                {ui.whatsapp}
              </a>
              <a
                href={mailHref}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-[#0F2B4C] border border-[#0F2B4C]/20 hover:bg-[#0F2B4C]/5 rounded-xl transition-colors"
              >
                <Mail size={18} />
                {ui.email}
              </a>
            </div>
            <p className="mt-4 text-sm text-[#0F2B4C]/60">
              WhatsApp {POLICY_CONTACT.whatsappLabel} · {POLICY_CONTACT.email}
            </p>
          </section>

          <section className="rounded-3xl bg-white border border-[#0F2B4C]/10 p-5 sm:p-7">
            <h2 className="text-xl font-serif font-bold text-[#0F2B4C]">{ui.deletedTitle}</h2>
            <ul className="mt-4 space-y-2.5">
              {ui.deleted.map((item) => (
                <li key={item} className="flex gap-2.5 text-[#0F2B4C]/80 leading-relaxed">
                  <CheckCircle2 size={17} className="text-[#F0A030] flex-shrink-0 mt-1" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <h2 className="mt-7 text-xl font-serif font-bold text-[#0F2B4C]">{ui.keptTitle}</h2>
            <p className="mt-3 text-[#0F2B4C]/75 leading-relaxed">{ui.kept}</p>
          </section>

          <GuideBlockView block={{ type: "tip", text: { es: UI.es.stopTip, en: UI.en.stopTip } }} l={l} />

          <Link
            to="/apps/cana-track/privacidad"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 font-semibold text-[#0F2B4C] border border-[#0F2B4C]/20 hover:bg-[#0F2B4C]/5 rounded-xl transition-colors w-full sm:w-auto"
          >
            <ShieldCheck size={18} />
            {ui.privacy}
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

export function TrackDeleteAccountPage() {
  useSeo({
    title: "Borrar cuenta de Cana Track — Cana Escapes",
    description:
      "Cómo pedir que borremos tu cuenta de Cana Track y todos tus datos: ubicación, recorridos, batería e historial.",
    path: "/apps/cana-track/borrar-cuenta",
  });

  return (
    <LangProvider>
      <DeleteContent />
    </LangProvider>
  );
}
