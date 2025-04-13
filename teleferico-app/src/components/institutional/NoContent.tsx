import { Hero } from "@/components";
import redgradient from "@/public/red-gradient.jpg";

export default function NoContent() {
  return (
    <Hero
      content={{
        cover: { src: redgradient.src, alt: "Gradiente rojo" },
        title: "No se encontro contenido para mostrar",
      }}
    />
  );
}
