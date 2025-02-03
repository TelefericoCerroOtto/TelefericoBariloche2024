import { Hero, ImageTextSection } from "@/components";
import pasarelasdesdeconfi from "@/public/pasarelasdesdeconfi.jpg";
import { items } from "./data";

export default function ThePlacePage() {
  return (
    <>
      <Hero
        image={{
          src: pasarelasdesdeconfi.src,
          alt: "Pasarelas con gente caminando y un fondo de montañas.",
        }}
        title="Disfrutá la cumbre de la montaña"
        description="La cumbre de la montaña te invita a desconectar y sumergirte en un ambiente único, donde la belleza natural se encuentra con momentos de calma y relajación. Un lugar perfecto para disfrutar de la calma y de vistas espectaculares en cualquier estación del año."
      />
      <ImageTextSection items={items} />
    </>
  );
}
