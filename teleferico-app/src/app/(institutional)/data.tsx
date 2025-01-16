import confiteria from "@/public/confiteria.jpg";
import gondolas from "@/public/gondolas.jpg";
import gondolasnevadas from "@/public/gondolasnevadas.jpg";
import type { ImageTextBlock } from "@/types/api";

export const items: ImageTextBlock[] = [
  {
    id: 1,
    images: [{ src: confiteria.src, alt: "confiteria nevada", order: 0 }],
    isTitleHighlighted: true,
    title: "Confiteria giratoria 360°",
    description:
      "A 1.405 metros sobre el nivel del mar, la Confitería gira en un radio de 360° en un tiempo de 20 minutos. Con capacidad para 200 personas y un ambiente cálido y confortable, se puede disfrutar de una propuesta gastronómica de excelencia, que incluye platos típicos como Goulash con spatzle, una Picada Regional con ahumados, y una selección de repostería artesanal, todo atendido por personal especializado. ¡Un recorrido gastronómico y visual inolvidable!",
    isInverted: false,
    variant: "defaultFW" as const,
  },
  {
    id: 2,
    images: [{ src: gondolas.src, alt: "gondolas", order: 0 }],
    isTitleHighlighted: false,
    title: "Teleférico",
    description:
      "El teleférico del Cerro Otto ofrece un ascenso cómodo y seguro en cualquier época del año, recorriendo 2.100 metros desde la Estación Inferior hasta la Superior, a 1.405 m.s.n.m., en solo 12 minutos. Con capacidad para transportar 500 pasajeros por hora en 42 góndolas panorámicas, el sistema se destaca por sus rigurosos controles de seguridad, garantizando un viaje tranquilo y una experiencia inolvidable, en un entorno preparado para disfrutar de actividades para todas las edades.",
    isInverted: true,
    variant: "defaultFW" as const,
  },
  {
    id: 3,
    images: [{ src: gondolasnevadas.src, alt: "gondolas nevadas", order: 0 }],
    isTitleHighlighted: true,
    title: "La excursión favorita de bariloche",
    description:
      "Un destino donde las emociones se conectan con la naturaleza. A 1.405 metros de altura, los visitantes encuentran paz, armonía y bienestar al respirar aire puro y contemplar un paisaje impresionante. Tanto turistas como residentes experimentan la serenidad y energía del entorno, y quienes nos visitan se llevan recuerdos memorables y el deseo de volver.",
    isInverted: false,
    variant: "defaultFW" as const,
  },
];
