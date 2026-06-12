import { useState } from "react";
import { Send, CheckCircle2, Phone, Mail, MapPin, Clock } from "lucide-react";
import { useLang } from "@/lib/LangContext";

type Tab = "guest" | "owner";

export function ContactSection({ defaultTab = "guest" }: { defaultTab?: Tab }) {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section id="contacto" className="py-20 sm:py-28 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-[#0F2B4C]/5 text-[#0F2B4C] text-sm font-semibold rounded-full mb-4">
            {t("contact_tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F2B4C] mb-4">
            {t("contact_title")}
          </h2>
        </div>

        <div className="grid lg:grid-cols-5 gap-10 max-w-5xl mx-auto">
          {/* Form */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => { setTab("guest"); setSubmitted(false); }}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    tab === "guest"
                      ? "text-[#0F2B4C] border-b-2 border-[#F0A030] bg-[#F0A030]/5"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t("contact_tab_guest")}
                </button>
                <button
                  onClick={() => { setTab("owner"); setSubmitted(false); }}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    tab === "owner"
                      ? "text-[#0F2B4C] border-b-2 border-[#F0A030] bg-[#F0A030]/5"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {t("contact_tab_owner")}
                </button>
              </div>

              <div className="p-6 sm:p-8">
                {submitted ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={28} className="text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-[#0F2B4C] mb-2">{t("contact_thanks")}</h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto">
                      {tab === "guest" ? t("contact_success_guest") : t("contact_success_owner")}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact_name")}</label>
                        <input
                          required
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F0A030] focus:ring-1 focus:ring-[#F0A030]/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact_email")}</label>
                        <input
                          type="email"
                          required
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F0A030] focus:ring-1 focus:ring-[#F0A030]/50 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact_whatsapp")}</label>
                      <input
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F0A030] focus:ring-1 focus:ring-[#F0A030]/50 transition-colors"
                      />
                    </div>

                    {tab === "guest" ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact_dates")}</label>
                          <input
                            type="text"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F0A030] focus:ring-1 focus:ring-[#F0A030]/50 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact_requests")}</label>
                          <textarea
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F0A030] focus:ring-1 focus:ring-[#F0A030]/50 transition-colors resize-none"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact_location")}</label>
                          <select className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F0A030] focus:ring-1 focus:ring-[#F0A030]/50 transition-colors bg-white">
                            <option>Cap Cana</option>
                            <option>Cocotal</option>
                            <option>Los Corales / Bávaro</option>
                            <option>Otro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("contact_type")}</label>
                          <select className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#F0A030] focus:ring-1 focus:ring-[#F0A030]/50 transition-colors bg-white">
                            <option>Apartamento</option>
                            <option>Villa</option>
                            <option>Penthouse</option>
                            <option>Studio</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#F0A030] hover:bg-[#e5952a] text-[#0F2B4C] font-semibold rounded-xl transition-all shadow-lg shadow-[#F0A030]/20"
                    >
                      <Send size={16} />
                      {tab === "guest" ? t("contact_send") : t("contact_eval")}
                    </button>

                    <p className="flex items-center justify-center gap-2 text-xs text-gray-400">
                      <Clock size={12} />
                      {t("contact_response")}
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Contact card */}
          <div className="lg:col-span-2 space-y-6">
            {/* Manager card */}
            <div className="bg-[#0F2B4C] rounded-2xl p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                {/* Brand sun mark */}
                <svg width="44" height="30" viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M 12 26 A 18 18 0 0 1 48 26 Z" fill="#F0A030" />
                  <line x1="2" y1="26" x2="58" y2="26" stroke="rgba(255,255,255,0.95)" strokeWidth="2" strokeLinecap="round" />
                  <line x1="9" y1="32" x2="51" y2="32" stroke="rgba(240,160,48,0.85)" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">{t("contact_manager")}</h3>
              <p className="text-sm text-white/50 mb-6">{t("contact_manager_role")}</p>

              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl">
                  <Phone size={14} className="text-[#F0A030]" />
                  <span className="text-sm text-white/70">+1 (809) 210-2773</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl">
                  <Mail size={14} className="text-[#F0A030]" />
                  <span className="text-sm text-white/70">michael@canaescapes.com</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl">
                  <MapPin size={14} className="text-[#F0A030]" />
                  <span className="text-sm text-white/70">Punta Cana, RD</span>
                </div>
              </div>
            </div>

            {/* Partner badge */}
            <div className="bg-gradient-to-br from-[#fdf8f0] to-[#fef6e8] border border-[#F0A030]/20 rounded-2xl p-5 text-center">
              <p className="text-sm font-medium text-[#0F2B4C]">{t("contact_partner")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
