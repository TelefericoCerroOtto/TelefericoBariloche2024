import { Hero } from "@/components";
import gondolasestacionamiento from "@/public/gondolasestacionamiento.jpg";

export default function HeroSection() {
  return (
    <Hero
      image={{ src: gondolasestacionamiento.src, alt: "Foto Portada" }}
      title="Opciones para llegar a la base y a la cumbre"
      description="Llegar a la base del teleférico es súper fácil y tenés varias opciones para elegir. Podés usar el servicio gratuito de colectivos que salen desde las dos cabañas del centro o manejar tu auto y estacionar cómodamente en el lugar"
    />
  );
}
