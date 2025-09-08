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
    <footer className="flex items-center justify-center bg-custom-red px-16 py-10 text-white lg:h-[350px]">
      <div className="flex w-full max-w-[1536px] flex-col items-stretch lg:flex-row">
        <div className="h-full min-h-[60px] w-full lg:w-1/2">
          <Image
            src={whitelogo.src}
            alt="logo blanco"
            width={156}
            height={60}
          />
        </div>
        <div className="flex h-full w-full flex-col-reverse justify-between gap-8 text-inherit lg:w-1/2 lg:flex-row">
          <div className="flex flex-col gap-3">
            <p className="font-bold">{footerIntl.contact.title}</p>
            <p>{footerIntl.contact.direction}</p>
            <p>Tel. +54 294 4441 1031</p>
            <ul className="flex gap-3">
              {socialIcons.map((item, idx) => (
                <li key={idx}>
                  <Link href={item.href} target="_blank">
                    <Image
                      width={25}
                      height={25}
                      src={item.imgsrc}
                      alt={footerIntl.socialitems[item.tag]}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-bold">Menu</p>
            <ul>
              {menuItems.map((item, idx) => (
                <li key={idx} className="hover:underline">
                  <CustomLink href={item.href}>
                    {footerIntl.menuitems[item.tag]}
                  </CustomLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
