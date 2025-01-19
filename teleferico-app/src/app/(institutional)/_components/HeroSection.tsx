import { CustomLink, Hero } from "@/components";
import decknevado from "@/public/decknevado.jpg";
import { ROUTES } from "@/utils/routes.const";

export default function HeroSection() {
  const { EXPLORE, LOCATION } = ROUTES;

  return (
    <Hero
      image={{ src: decknevado.src, alt: "Foto Portada" }}
      title="Complejo turístico teleférico cerro otto"
      description="Vení a vivir una experiencia única en el corazón de San Carlos de
              Bariloche. Rodeado de montañas, lagos y bosques, el Complejo
              Turístico Teleférico Cerro Otto es el lugar ideal para conectar con
              la naturaleza en todas las estaciones del año."
    >
      <CustomLink href={EXPLORE} intent="outlineWhite">
        La Cumbre
      </CustomLink>
      <CustomLink href={LOCATION} intent="ghostWhite">
        Como Llegar
      </CustomLink>
    </Hero>
  );
}
