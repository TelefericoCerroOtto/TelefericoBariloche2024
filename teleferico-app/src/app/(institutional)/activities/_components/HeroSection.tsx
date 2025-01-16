import { Hero } from "@/components";
import lagodesdecumbre from "@/public/lagodesdecumbre.jpg";

export default function HeroSection() {
  return (
    <Hero
      image={{
        src: lagodesdecumbre.src,
        alt: "Lago Nahuel Huapi desde la cumbre del Cerro Otto con una cabaña",
      }}
      title="Descubrí Todo Lo Que Podés Hacer"
      description="Cada rincón ofrece una experiencia única para disfrutar del entorno natural y la belleza de Bariloche. Ya sea buscando relajación o aventura, el lugar invita a explorar y vivir momentos inolvidables en un paisaje de montaña incomparable."
    />
  );
}
