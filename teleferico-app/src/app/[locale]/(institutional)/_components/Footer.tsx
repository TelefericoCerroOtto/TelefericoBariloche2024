import { CustomLink } from "@/components";
import { i18n } from "@/i18n";
import { getComponentTranslation } from "@/lib/services";
import fblogo from "@/public/fblogo.svg";
import iglogo from "@/public/iglogo.svg";
import whitelogo from "@/public/logo-blanco.svg";
import ytlogo from "@/public/ytlogo.svg";
import type { Locales } from "@/types";
import { ROUTES } from "@/utils";
import Image from "next/image";
import Link from "next/link";

const menuItems = [
  { tag: "jobs" as const, href: ROUTES.JOBS },
  { tag: "contact" as const, href: ROUTES.CONTACT },
  { tag: "policies" as const, href: ROUTES.POLICIES },
  { tag: "faqs" as const, href: ROUTES.FAQS },
];

const socialIcons = [
  {
    href: "https://www.facebook.com/people/Teleférico-Cerro-Otto-Bariloche/61557109030764/",
    imgsrc: fblogo.src,
    tag: "fb" as const,
  },
  {
    href: "https://www.instagram.com/telefericoottobariloche/",
    imgsrc: iglogo.src,
    tag: "ig" as const,
  },
  {
    href: "https://www.youtube.com/",
    imgsrc: ytlogo.src,
    tag: "tt" as const,
  },
];

interface Props {
  locale: Locales;
}

export default async function Footer(props: Props) {
  const { locale = i18n.defaultLocale } = props;
  const { ok, data } = await getComponentTranslation(locale, "footer");

  if (!ok) {
    // TODO: Mejorar respuesta de la interfaz en caso de que no se pueda recuperar la informacion
    throw new Error("No se pudo recuperar la informacion del footer");
  }

  const footerIntl = data.data[0].jsonValue;

  return (
    <footer
      role="contentinfo"
      className="bg-custom-red text-white"
    >
      <div className="mx-auto w-full max-w-[1536px] px-6 py-12 sm:px-10 lg:px-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_repeat(2,minmax(0,1fr))] lg:gap-16">
          <div className="flex flex-col items-center gap-6 text-center md:items-start md:text-left">
            <Image
              src={whitelogo.src}
              alt="logo blanco"
              width={220}
              height={84}
              className="h-auto w-44 sm:w-52 lg:w-56"
            />
            {/* Social icons include aria-labels for clearer assistive tech announcements. */}
            <ul className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
              {socialIcons.map((item, idx) => (
                <li key={idx}>
                  <Link
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={footerIntl.socialitems[item.tag]}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    <Image
                      width={24}
                      height={24}
                      src={item.imgsrc}
                      alt={footerIntl.socialitems[item.tag]}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <section className="space-y-3 text-center text-sm text-white/80 md:text-left">
            <h2 className="text-base font-semibold uppercase tracking-wide text-white">
              {footerIntl.contact.title}
            </h2>
            <address className="space-y-1 not-italic">
              <p>{footerIntl.contact.direction}</p>
              <p className="text-white">Tel. +54 294 4441 1031</p>
            </address>
          </section>
          <nav
            aria-label="Footer"
            className="text-center md:text-left"
          >
            {/* Grouping links within nav helps screen readers announce the section as navigational. */}
            <h2 className="text-base font-semibold uppercase tracking-wide text-white">
              Menu
            </h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-white/80">
              {menuItems.map((item, idx) => (
                <li key={idx}>
                  <CustomLink
                    href={item.href}
                    className="transition hover:text-white hover:underline focus-visible:text-white focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {footerIntl.menuitems[item.tag]}
                  </CustomLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
