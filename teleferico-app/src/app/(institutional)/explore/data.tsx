import confiteria from "@/public/confiteria.jpg";
import confiteriadesdeadentro from "@/public/confiteriadesdeadentro.jpg";
import eldavid from "@/public/eldavid.png";
import elmoises from "@/public/elmoises.png";
import fotoshop from "@/public/fotoshop.jpeg";
import funicularyconfiterianevados from "@/public/funicularyconfiterianevados.jpg";
import lapiedad from "@/public/lapiedad.jpg";
import merchandising from "@/public/merchandising.jpg";
import type { ImageTextBlock } from "@/types";

export const items: ImageTextBlock[] = [
  {
    id: 1,
    images: [
      {
        order: 0,
        src: confiteriadesdeadentro.src,
        alt: "Gente comiendo dentro de la confiteria giratoria",
      },
      {
        order: 1,
        src: funicularyconfiterianevados.src,
        alt: "Funicular y confiteria nevados",
      },
      {
        order: 1,
        src: confiteria.src,
        alt: "Confiteria nevada desde la terraza panoramica",
      },
    ],
    link: { href: "/explore/1", label: "Mas informacion" },
    isTitleHighlighted: false,
    title: "Confiteria giratoria",
    description:
      "A 1.405 metros sobre el nivel del mar, la exclusiva Confitería Giratoria ofrece una experiencia única: un recorrido de 360° en 20 minutos, permitiendo a los pasajeros disfrutar de una vista espectacular del Parque Nacional Nahuel Huapi.",
    isInverted: false,
    variant: "horizontal" as const,
  },
  {
    id: 2,
    images: [
      {
        order: 0,
        src: eldavid.src,
        alt: "Estatua de El David",
      },
      {
        order: 1,
        src: lapiedad.src,
        alt: "Estatua de La Piedad",
      },
      {
        order: 1,
        src: elmoises.src,
        alt: "Estatua de El Moises",
      },
    ],
    link: { href: "/explore/2", label: "Mas informacion" },
    isTitleHighlighted: false,
    title: "Galeria de arte",
    description:
      "En la Galería de Arte del Teleférico Cerro Otto, se exhiben calcos exactos, en tamaño real y certificados por el gobierno italiano, de tres de las obras más emblemáticas de Miguel Ángel Buonarroti: El David, La Piedad y El Moisés. Estas réplicas, construidas con un 80% de polvo de mármol y 20% de resina acrílica, son fieles a los originales.",
    isInverted: false,
    variant: "ladder" as const,
  },
  {
    id: 3,
    images: [
      {
        order: 0,
        src: merchandising.src,
        alt: "Local de recuerdos del Teleferico Cerro Otto",
      },
      {
        order: 1,
        src: merchandising.src,
        alt: "Local de recuerdos del Teleferico Cerro Otto",
      },
      {
        order: 2,
        src: merchandising.src,
        alt: "Local de recuerdos del Teleferico Cerro Otto",
      },
    ],
    link: { href: "/explore/3", label: "Mas informacion" },
    isTitleHighlighted: false,
    title: "Merchandising",
    description:
      "En los locales de merchandising del complejo, los visitantes encontrarán una amplia variedad de recuerdos para todos los gustos: desde mates, tazas y jarras de cerveza hasta bijouterie, imanes, peluches de perros San Bernardo y las tradicionales postales del Parque Nacional Nahuel Huapi.",
    isInverted: true,
    variant: "miniatures" as const,
  },
  {
    id: 4,
    images: [
      {
        order: 0,
        src: fotoshop.src,
        alt: "Montaje de personas cayendose de la gondola",
      },
    ],
    link: { href: "/explore/4", label: "Mas informacion" },
    isTitleHighlighted: false,
    title: "Foto Shop",
    description:
      "Diversión y adrenalina sin preocupaciones. Al finalizar tu experiencia en la montaña, no te pierdas la oportunidad de capturar el momento en nuestro local de FOTOSHOP. Allí podrás posar en una góndola fija especialmente diseñada para simular emocionantes piruetas en el aire.",
    isInverted: false,
    variant: "miniatures" as const,
  },
];
