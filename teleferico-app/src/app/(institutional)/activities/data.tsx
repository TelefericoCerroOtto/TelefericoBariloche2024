import cabañaespejosnevada from "@/public/cabañaespejosnevada.jpg";
import decknevado from "@/public/decknevado.jpg";
import funicularnevado from "@/public/funicularnevado.jpg";
import palestra from "@/public/palestra.jpg";
import raquetas from "@/public/raquetas.jpg";
import tirolesa from "@/public/tirolesa.jpg";
import trineo from "@/public/trineo.jpg";
import type { ImageTextBlock } from "@/types";

export const items: ImageTextBlock[] = [
  {
    id: 1,
    images: [
      {
        order: 1,
        src: raquetas.src,
        alt: "Gente con raquetas para nieve sobre la montaña",
      },
    ],
    link: { href: "/activities/1", label: "Mas informacion" },
    isTitleHighlighted: false,
    title: "Caminata con raquetas de nieve",
    description:
      "Una experiencia única para disfrutar del invierno sin necesidad de experiencia previa. Las caminatas con raquetas te llevan a recorrer el bosque cubierto de nieve, mientras un guía experto te cuenta sobre la flora, fauna y geografía local.",
    isInverted: false,
    variant: "default" as const,
  },
  {
    id: 2,
    images: [
      {
        order: 1,
        src: cabañaespejosnevada.src,
        alt: "Cabaña rodeada de árboles cubiertos de nieve",
      },
    ],
    link: { href: "/activities/2", label: "Mas informacion" },
    isTitleHighlighted: false,
    title: "Circuito Otto",
    description:
      "Un recorrido lleno de desafíos y diversión para estudiantes y familias con niños. El circuito incluye el Laberinto del Bosque. Luego, cruzarás un emocionante Puente Colgante, para finalmente disfrutar de una caminata guiada por el bosque.",
    isInverted: false,
    variant: "panoramic" as const,
  },
  {
    id: 3,
    images: [
      {
        order: 1,
        src: decknevado.src,
        alt: "Deck panoramico con nieve y personas admirando el paisaje",
      },
    ],
    link: { href: "/activities/3", label: "Mas informacion" },
    isTitleHighlighted: false,
    title: "Impresionate con el deck panoramico",
    description:
      "Un lugar ideal para relajarse y disfrutar de vistas espectaculares del lago Nahuel Huapi, la estepa patagónica y los cerros a su alrededor. Con más de 100 metros cuadrados, es el punto perfecto para descansar tras realizar actividades en la montaña.",
    isInverted: false,
    variant: "default" as const,
  },
  {
    id: 4,
    images: [
      {
        order: 1,
        src: trineo.src,
        alt: "Deck panoramico con nieve y personas admirando el paisaje",
      },
    ],
    link: { href: "/activities/4", label: "Mas informacion" },
    isTitleHighlighted: false,
    title: "Descendé por la Pista De Trineos",
    description:
      "Vení a disfrutar de la nieve en las pistas de trineos del Cerro Otto, rodeadas de bosques de lengas, pinos y ñires. Con diferentes grados de dificultad, cada pista te ofrece una experiencia única.",
    isInverted: false,
    variant: "panoramic" as const,
  },
  {
    id: 5,
    images: [
      {
        order: 1,
        src: tirolesa.src,
        alt: "Persona lanzandose desde una tirolesa nevada",
      },
    ],
    link: { href: "/activities/5", label: "Mas informacion" },
    isTitleHighlighted: false,
    title: "Viví la adrenalina de la tirolesa",
    description:
      "Experimentá la altura desde una nueva perspectiva a 1405 m.s.n.m. Esta tirolesa, con 60 metros de recorrido y 7 metros de altura desde la base, te permite vivir una sensación única y segura, con el paisaje espectacular del Cerro Otto.",
    isInverted: false,
    variant: "default" as const,
  },
  {
    id: 6,
    images: [
      {
        order: 1,
        src: palestra.src,
        alt: "Niña escalando una palestra en verano",
      },
    ],
    link: { href: "/activities/6", label: "Mas informacion" },
    isTitleHighlighted: false,
    title: "Descendé por la Pista De Trineos",
    description:
      "Vení a disfrutar de la nieve en las pistas de trineos del Cerro Otto, rodeadas de bosques de lengas, pinos y ñires. Con diferentes grados de dificultad, cada pista te ofrece una experiencia única.",
    isInverted: false,
    variant: "panoramic" as const,
  },
  {
    id: 7,
    images: [
      {
        order: 1,
        src: funicularnevado.src,
        alt: "Funicular de la cumbre nevado",
      },
    ],
    link: { href: "/activities/7", label: "Mas informacion" },
    isTitleHighlighted: false,
    title: "Viajá por el Funicular de la cumbre",
    description:
      "El Funicular de la Cumbre es un exclusivo sistema de transporte diseñado en Bariloche, pensado para llevarte de regreso al punto de partida de las pistas. Este servicio te permite ascender un tramo de la montaña con total comodidad.",
    isInverted: false,
    variant: "default" as const,
  },
];
