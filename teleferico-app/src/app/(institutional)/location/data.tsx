import confiteriadesdeadentro from "@/public/confiteriadesdeadentro.jpg";
import estacionamiento from "@/public/estacionamiento.jpg";
import funicularyconfiterianevados from "@/public/funicularyconfiterianevados.jpg";
import gondoladespegando from "@/public/gondoladespegando.jpg";
import type { ImageTextBlock } from "@/types";

export const items: ImageTextBlock[] = [
  {
    id: 1,
    images: [
      {
        order: 0,
        src: funicularyconfiterianevados.src,
        alt: "Funicular y confiteria nevados",
      },
      {
        order: 1,
        src: confiteriadesdeadentro.src,
        alt: "Gente comiendo dentro de la confiteria giratoria",
      },
    ],
    link: {
      href: "https://maps.app.goo.gl/286Jdb8tcfHbu3mx9",
      label: "Ver en google maps",
    },
    isTitleHighlighted: false,
    title: "Traslado Gratuito a la base",
    description: (
      <>
        En el centro de la ciudad hay dos cabañas que pertenecen al teleférico y
        que ofrecen un{" "}
        <span className="font-bold">
          servicio gratuito de traslado a la base.
        </span>{" "}
        La primera está en la esquina de Mitre y Villegas, justo frente a
        RapaNui, y la otra se ubica en la esquina de Independencia y Avenida San
        Martín, enfrente de la oficina de Parques Nacionales. Desde cualquiera
        de estas cabañas, podés tomar colectivos que tienen capacidad para 42
        pasajeros y que te llevan directo a la base.
      </>
    ),
    isInverted: false,
    variant: "default" as const,
  },
  {
    id: 2,
    images: [
      {
        order: 0,
        src: estacionamiento.src,
        alt: "Calle con bus del Teleferico y estacionamiento",
      },
    ],
    link: {
      href: "https://maps.app.goo.gl/6krj3KnEXEwkSZ5K8",
      label: "Ver en google maps",
    },
    isTitleHighlighted: false,
    title: "Estacionamiento para vehiculos particulares",
    description: (
      <>
        Si preferís manejar, podés ir hasta la base en tu vehículo. Allí hay{" "}
        <span className="font-bold">estacionamiento sin cargo</span>, y podés
        adquirir los boletos en el lugar. También podés usar los colectivos de
        línea 50 o 51. Tenés que bajarte en la parada del km 5 y caminar 100
        metros más por la Avenida Los Pioneros hasta llegar a la base.
      </>
    ),
    isInverted: true,
    variant: "default" as const,
  },
  {
    id: 3,
    images: [
      {
        order: 0,
        src: gondoladespegando.src,
        alt: "gondola despegando desde la base del Teleferico",
      },
    ],
    link: {
      href: "https://maps.app.goo.gl/6krj3KnEXEwkSZ5K8",
      label: "Ver en google maps",
    },
    isTitleHighlighted: false,
    title: "Subida En Teleferico a la cumbre",
    description:
      "La base del teleférico está en el km 5 de la Avenida Los Pioneros, donde salen las gondolas. Este servicio te lleva en un recorrido espectacular que tarda aproximadamente 12 minutos en llegar a la cima. ",
    isInverted: false,
    variant: "default" as const,
  },
];
