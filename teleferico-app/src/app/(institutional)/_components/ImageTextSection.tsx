import { ImageTextBlock } from "@/components";
import confiteria from "@/public/confiteria.jpg";
import gondolas from "@/public/gondolas.jpg";
import gondolasnevadas from "@/public/gondolasnevadas.jpg";

const items = [
  {
    id: 1,
    image: { src: confiteria.src, alt: "confiteria nevada" },
    isTitleHighlighted: true,
    title: "Confiteria giratoria 360°",
    description:
      "A 1.405 metros sobre el nivel del mar, la Confitería gira en un radio de 360° en un tiempo de 20 minutos. Con capacidad para 200 personas y un ambiente cálido y confortable, se puede disfrutar de una propuesta gastronómica de excelencia, que incluye platos típicos como Goulash con spatzle, una Picada Regional con ahumados, y una selección de repostería artesanal, todo atendido por personal especializado. ¡Un recorrido gastronómico y visual inolvidable!",
    isInverted: false,
  },
  {
    id: 2,
    image: { src: gondolas.src, alt: "gondolas" },
    isTitleHighlighted: false,
    title: "Teleférico",
    description:
      "El teleférico del Cerro Otto ofrece un ascenso cómodo y seguro en cualquier época del año, recorriendo 2.100 metros desde la Estación Inferior hasta la Superior, a 1.405 m.s.n.m., en solo 12 minutos. Con capacidad para transportar 500 pasajeros por hora en 42 góndolas panorámicas, el sistema se destaca por sus rigurosos controles de seguridad, garantizando un viaje tranquilo y una experiencia inolvidable, en un entorno preparado para disfrutar de actividades para todas las edades.",
    isInverted: true,
  },
  {
    id: 3,
    image: { src: gondolasnevadas.src, alt: "gondolas nevadas" },
    isTitleHighlighted: true,
    title: "La excursión favorita de bariloche",
    description:
      "Un destino donde las emociones se conectan con la naturaleza. A 1.405 metros de altura, los visitantes encuentran paz, armonía y bienestar al respirar aire puro y contemplar un paisaje impresionante. Tanto turistas como residentes experimentan la serenidad y energía del entorno, y quienes nos visitan se llevan recuerdos memorables y el deseo de volver.",
    isInverted: false,
  },
];

export default function ImageTextSection() {
  return (
    <section className="mb-14 w-full">
      {items.map((item) => (
        <ImageTextBlock
          key={item.id}
          image={item.image}
          isTitleHighlighted={item.isTitleHighlighted}
          title={item.title}
          description={item.description}
          isInverted={item.isInverted}
        />
      ))}
    </section>
  );
}
