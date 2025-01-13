import { Hero } from "@/components";
import decknevado from "@/public/decknevado.jpg";
import { ROUTES } from "@/utils/routes.const";
import { buttonStyles } from "@/utils/styles";
import Link from "next/link";

export default function HeroSection() {
  const { INFO } = ROUTES;

  return (
    <Hero
      image={{ src: decknevado.src, alt: "Foto Portada" }}
      title="Complejo turístico teleférico cerro otto"
      description="Vení a vivir una experiencia única en el corazón de San Carlos de
              Bariloche. Rodeado de montañas, lagos y bosques, el Complejo
              Turístico Teleférico Cerro Otto es el lugar ideal para conectar con
              la naturaleza en todas las estaciones del año."
    >
      <Link href={INFO} className={buttonStyles({ intent: "outlineWhite" })}>
        La Cumbre
      </Link>
      <Link href={INFO} className={buttonStyles({ intent: "ghostWhite" })}>
        Como Llegar
      </Link>
    </Hero>
  );
}
