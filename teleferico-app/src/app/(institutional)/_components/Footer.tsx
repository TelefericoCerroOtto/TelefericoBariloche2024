import { ROUTES } from "@/utils/routes.const";
import Link from "next/link";
import Image from "next/image";
import whitelogo from "@/public/logo-blanco.svg";
import ytlogo from "@/public/ytlogo.svg";
import fblogo from "@/public/fblogo.svg";
import iglogo from "@/public/iglogo.svg";

const menuItems = [
  { label: "Trabajo", href: ROUTES.INFO },
  { label: "Contacto", href: ROUTES.INFO },
  { label: "Reglamento", href: ROUTES.POLICIES },
  { label: "Preguntas frecuentes", href: ROUTES.INFO },
];

const socialItems = [
  {
    href: "https://www.facebook.com/people/Teleférico-Cerro-Otto-Bariloche/61557109030764/",
    imgsrc: fblogo.src,
    alt: "fb logo",
  },
  {
    href: "https://www.instagram.com/telefericoottobariloche/",
    imgsrc: iglogo.src,
    alt: "ig logo",
  },
  {
    href: "https://www.youtube.com/",
    imgsrc: ytlogo.src,
    alt: "yt logo",
  },
];

export default function Footer() {
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
            <p className="font-bold">Medios de contacto</p>
            <p>
              Av. De los Pioneros KM 5.000, San Carlos De Bariloche, Rio Negro,
              Argentina
            </p>
            <p>Tel. +54 294 4441 1031</p>
            <ul className="flex gap-3">
              {socialItems.map((item, idx) => (
                <li key={idx}>
                  <Link href={item.href} target="_blank">
                    <Image
                      width={25}
                      height={25}
                      src={item.imgsrc}
                      alt={item.alt}
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
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
