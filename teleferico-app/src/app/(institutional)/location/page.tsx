import {
  Hero,
  HoursOverview,
  ImageTextSection,
  PageWrapper,
} from "@/components";
import gondolasestacionamiento from "@/public/gondolasestacionamiento.jpg";
import { items } from "./data";

export default function LocationPage() {
  return (
    <PageWrapper>
      <Hero
        image={{ src: gondolasestacionamiento.src, alt: "Foto Portada" }}
        title="Opciones para llegar a la base y a la cumbre"
        description="Llegar a la base del teleférico es súper fácil y tenés varias opciones para elegir. Podés usar el servicio gratuito de colectivos que salen desde las dos cabañas del centro o manejar tu auto y estacionar cómodamente en el lugar"
      />
      <ImageTextSection items={items} />
      <HoursOverview />
    </PageWrapper>
  );
}
