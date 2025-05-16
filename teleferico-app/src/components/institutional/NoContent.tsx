import { Hero } from "@/components";
import redgradient from "@/public/red-gradient.jpg";
import type { Locales } from "@/types";

interface Props {
  locale: Locales;
}

export default function NoContent(props: Props) {
  const { locale } = props;
  const dictionaries: Record<Locales, string> = {
    "es-AR": "Próximamente vas a encontrar contenido acá",
    en: "You'll find content here soon",
    pt: "Em breve você encontrará conteúdo aqui",
  };

  return (
    <Hero
      content={{
        cover: { src: redgradient.src, alt: "Gradiente rojo" },
        title: dictionaries[locale],
      }}
    />
  );
}
