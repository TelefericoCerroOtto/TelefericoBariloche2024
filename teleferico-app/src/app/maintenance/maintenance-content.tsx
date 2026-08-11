"use client";

import Image from "next/image";
import { Facebook, Instagram, Mail, Phone, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import BrandLogo from "@/public/logo.svg";
import BrandMark from "@/public/logo-recortado.svg";
import { useServiceState } from "@/hooks/use-service-state";
import { MaintenanceStatusSection } from "./maintenance-status-section";

type SupportedLocale = "es-AR" | "en" | "pt";
type ContactChannelKey = "instagram" | "facebook" | "email" | "phone";

type ContactChannel = {
  key: ContactChannelKey;
  href: string;
  value: string;
  icon: LucideIcon;
  external?: boolean;
};

const CONTACT_CHANNELS: ContactChannel[] = [
  {
    key: "instagram",
    href: "https://www.instagram.com/telefericoottobariloche/",
    value: "@telefericoottobariloche",
    icon: Instagram,
    external: true,
  },
  {
    key: "facebook",
    href: "https://www.facebook.com/people/Teleférico-Cerro-Otto-Bariloche/61557109030764/",
    value: "@telefericocerroottobariloche",
    icon: Facebook,
    external: true,
  },
  {
    key: "email",
    href: "mailto:info@telefericobariloche.com.ar",
    value: "info@telefericobariloche.com.ar",
    icon: Mail,
  },
  {
    key: "phone",
    href: "tel:+542944441035",
    value: "+54 294 444 1035",
    icon: Phone,
  },
];

const translations = {
  "es-AR": {
    badge: "Mantenimiento programado",
    title: "Estamos realizando tareas de mantenimiento",
    message:
      "El sitio se encuentra temporalmente no disponible mientras realizamos tareas de mantenimiento. Gracias por tu paciencia.",
    support: "Podés cambiar de idioma sin salir de esta pantalla.",
    statusTitle: "Trabajo en curso",
    statusMessage:
      "Nuestro equipo está trabajando para restablecer el sitio de forma segura y estable lo antes posible.",
    contactEyebrow: "Contacto",
    contactTitle: "¿Necesitás hablarnos?",
    contactMessage:
      "Si estás frente a la pantalla de mantenimiento, podés escribirnos o llamarnos por cualquiera de estos canales.",
    contactSupport: "Te respondemos por el canal más rápido disponible.",
    contactChannels: {
      instagram: {
        label: "Instagram",
        action: "Mandanos un mensaje directo",
      },
      facebook: {
        label: "Facebook",
        action: "Escribinos por Messenger o en la página",
      },
      email: {
        label: "Correo electrónico",
        action: "Escribinos un mail",
      },
      phone: {
        label: "Teléfono",
        action: "Llamanos",
      },
    },
    localeSwitcherLabel: "Idioma",
    localeActionPrefix: "Cambiar idioma a",
    skipToContent: "Saltar al contenido",
    localeNames: {
      "es-AR": "Español",
      en: "Inglés",
      pt: "Portugués",
    },
  },
  en: {
    badge: "Scheduled maintenance",
    title: "We are performing maintenance",
    message:
      "The site is temporarily unavailable while maintenance work is in progress. Thank you for your patience.",
    support: "You can switch languages without leaving this screen.",
    statusTitle: "Work in progress",
    statusMessage:
      "Our team is working to restore the site safely and reliably as soon as possible.",
    contactEyebrow: "Contact",
    contactTitle: "Need to reach us another way?",
    contactMessage:
      "If you are on this maintenance screen, you can reach us through any of these channels.",
    contactSupport: "We will respond through the fastest available channel.",
    contactChannels: {
      instagram: {
        label: "Instagram",
        action: "Send us a direct message",
      },
      facebook: {
        label: "Facebook",
        action: "Message us on Messenger or the page",
      },
      email: {
        label: "Email",
        action: "Send us an email",
      },
      phone: {
        label: "Phone",
        action: "Call us",
      },
    },
    localeSwitcherLabel: "Language",
    localeActionPrefix: "Switch language to",
    skipToContent: "Skip to content",
    localeNames: {
      "es-AR": "Spanish",
      en: "English",
      pt: "Portuguese",
    },
  },
  pt: {
    badge: "Manutenção programada",
    title: "Estamos realizando manutenção",
    message:
      "O site está temporariamente indisponível enquanto realizamos tarefas de manutenção. Obrigado pela paciência.",
    support: "Você pode trocar o idioma sem sair desta tela.",
    statusTitle: "Trabalho em andamento",
    statusMessage:
      "Nossa equipe está trabalhando para restaurar o site com segurança e estabilidade o quanto antes.",
    contactEyebrow: "Contato",
    contactTitle: "Precisa falar com a gente?",
    contactMessage:
      "Se você está nesta tela de manutenção, pode falar com a gente por qualquer um destes canais.",
    contactSupport: "Vamos responder pelo canal mais rápido disponível.",
    contactChannels: {
      instagram: {
        label: "Instagram",
        action: "Envie uma mensagem direta",
      },
      facebook: {
        label: "Facebook",
        action: "Fale com a gente pelo Messenger ou pela página",
      },
      email: {
        label: "E-mail",
        action: "Envie um e-mail",
      },
      phone: {
        label: "Telefone",
        action: "Ligue para nós",
      },
    },
    localeSwitcherLabel: "Idioma",
    localeActionPrefix: "Alterar idioma para",
    skipToContent: "Pular para o conteúdo",
    localeNames: {
      "es-AR": "Espanhol",
      en: "Inglês",
      pt: "Português",
    },
  },
} as const;

const SUPPORTED_LOCALES: SupportedLocale[] = ["es-AR", "en", "pt"];

const LOCALE_SHORT_LABELS: Record<SupportedLocale, string> = {
  "es-AR": "ES",
  en: "EN",
  pt: "PT",
};

const BRAND_LABEL = "Teleférico Cerro Otto";
const BRAND_FOOTER = "Teleférico Cerro Otto — Bariloche, Patagonia Argentina";

function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

interface MaintenanceContentProps {
  initialLocale: string;
}

export function MaintenanceContent({ initialLocale }: MaintenanceContentProps) {
  const resolved = isSupportedLocale(initialLocale) ? initialLocale : "es-AR";
  const [locale, setLocale] = useState<SupportedLocale>(resolved);
  const { serviceState, isLoading, isError } = useServiceState();

  // Keep the <html lang> attribute in sync so screen readers announce the
  // correct language when the user switches locale on the maintenance page.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = translations[locale];

  return (
    <main
      id="maintenance-content"
      aria-labelledby="maintenance-title"
      className="relative isolate min-h-screen overflow-hidden bg-gradient-to-b from-[#fefbf8] via-[#f4ede7] to-[#ebe2db] text-foreground"
    >
      <a
        href="#maintenance-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:h-11 focus:items-center focus:justify-center focus:rounded-full focus:bg-white focus:px-4 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-custom-red focus:ring-offset-2 focus:ring-offset-background"
      >
        {t.skipToContent}
      </a>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(159,18,18,0.24),transparent_38%),radial-gradient(circle_at_14%_18%,rgba(255,255,255,0.92),transparent_28%),linear-gradient(180deg,rgba(255,251,249,0.92),rgba(255,255,255,0.24))]" />
        <div className="absolute -left-20 top-24 h-64 w-64 rounded-full bg-white/80 blur-3xl" />
        <div className="absolute -right-32 top-0 h-80 w-80 rounded-full bg-custom-red/28 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-[48%] bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.02)_18%,rgba(0,0,0,0.16)_100%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <section className="mx-auto w-full max-w-5xl">
          <div className="relative overflow-hidden rounded-[2rem] border border-custom-red/20 bg-white/90 shadow-2xl shadow-[rgba(159,18,18,0.08)] backdrop-blur">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-custom-red via-[#c41c1c] to-black" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-24 top-10 h-52 w-52 rounded-full bg-custom-red/16 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-20 right-6 h-44 w-44 rounded-full bg-black/5 blur-3xl" aria-hidden="true" />
            <Image
              src={BrandMark}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-6 top-6 w-20 opacity-10"
            />
            <div className="relative flex h-full flex-col p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Image
                    src={BrandLogo}
                    alt={BRAND_LABEL}
                    className="h-11 w-auto sm:h-12"
                    priority
                  />
                  <div className="hidden h-10 w-px bg-custom-border sm:block" aria-hidden="true" />
                  <p
                    translate="no"
                    className="hidden text-sm font-semibold uppercase tracking-[0.32em] text-foreground/55 sm:block"
                  >
                    {BRAND_LABEL}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-foreground/45">
                    {t.localeSwitcherLabel}
                  </p>
                  <div className="mt-2 inline-flex rounded-full border border-custom-border/80 bg-background/80 p-1 shadow-sm">
                    {SUPPORTED_LOCALES.map((nextLocale) => {
                      const active = locale === nextLocale;

                      return (
                        <button
                          key={nextLocale}
                          type="button"
                          onClick={() => setLocale(nextLocale)}
                          aria-pressed={active}
                          aria-label={`${t.localeActionPrefix} ${t.localeNames[nextLocale]}`}
                          className={`inline-flex h-12 items-center justify-center rounded-full px-4 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-custom-red focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                            active
                              ? "bg-custom-red text-white shadow-sm"
                              : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                          }`}
                        >
                          {LOCALE_SHORT_LABELS[nextLocale]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                aria-live="polite"
                aria-atomic="true"
                className="mt-8 max-w-2xl space-y-5"
              >
                 <span className="inline-flex items-center gap-2 rounded-full border border-custom-red/20 bg-custom-red/10 px-3.5 py-1.5 text-sm font-semibold uppercase tracking-[0.28em] text-custom-red">
                  <span className="h-1.5 w-1.5 rounded-full bg-custom-red" aria-hidden="true" />
                  {t.badge}
                </span>

                <h1
                  id="maintenance-title"
                  className="max-w-2xl text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl"
                >
                  {t.title}
                </h1>

                <p className="max-w-3xl text-lg leading-8 text-foreground/72 sm:text-xl sm:leading-9">
                  {t.message}
                </p>

                <p className="max-w-2xl text-base leading-7 text-foreground/60 sm:text-lg sm:leading-8">
                  {t.support}
                </p>
              </div>

              <MaintenanceStatusSection
                locale={locale}
                maintenanceCopy={{
                  title: t.statusTitle,
                  message: t.statusMessage,
                }}
                serviceState={serviceState}
                isLoading={isLoading}
                isError={Boolean(isError)}
              />

              <section
                aria-labelledby="maintenance-contact-title"
                className="mt-8 rounded-[1.75rem] border border-custom-red/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(255,246,244,0.95))] p-5 shadow-sm sm:p-6"
              >
                <div className="max-w-2xl space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-custom-red/80">
                    {t.contactEyebrow}
                  </p>
                  <h2
                    id="maintenance-contact-title"
                    className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  >
                    {t.contactTitle}
                  </h2>
                  <p className="text-base leading-7 text-foreground/70 sm:text-lg sm:leading-8">
                    {t.contactMessage}
                  </p>
                  <p className="text-sm leading-6 text-foreground/55 sm:text-base">
                    {t.contactSupport}
                  </p>
                </div>

                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {CONTACT_CHANNELS.map((channel) => {
                    const channelText = t.contactChannels[channel.key];
                    const Icon = channel.icon;

                    return (
                      <li key={channel.key} className="h-full">
                        <a
                          href={channel.href}
                          target={channel.external ? "_blank" : undefined}
                          rel={channel.external ? "noopener noreferrer" : undefined}
                          aria-label={`${channelText.label}: ${channelText.action}`}
                          className="group flex h-full flex-col rounded-2xl border border-custom-border/80 bg-white/90 p-4 transition hover:-translate-y-0.5 hover:border-custom-red/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-custom-red focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-custom-red/10 text-custom-red transition group-hover:bg-custom-red group-hover:text-white">
                              <Icon className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/50">
                                {channelText.label}
                              </p>
                              <p className="break-words text-base font-semibold text-foreground sm:text-lg">
                                <span translate="no">{channel.value}</span>
                              </p>
                            </div>
                          </div>
                          <p className="mt-4 text-sm leading-6 text-foreground/65 transition group-hover:text-foreground/80">
                            {channelText.action}
                          </p>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-custom-red/15 pt-6 text-sm text-foreground/55">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-custom-red" aria-hidden="true" />
                  <span translate="no">{BRAND_FOOTER}</span>
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
