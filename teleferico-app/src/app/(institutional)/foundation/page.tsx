import { BlockRendererClient, Hero, ImageTextRenderer } from "@/components";
import puerto from "@/public/puerto.jpg";
import fsmflogo from "@/public/fsmflogo.svg";
import panificadora from "@/public/panificadora.jpg";
import Image from "next/image";
import data from "./data.json";
import { type BlocksContent } from "@strapi/blocks-react-renderer";

export default function FoundationPage() {
  const aboutContent = data.about as BlocksContent;
  const historyContent = data.history as BlocksContent;
  const bakeryContent = data.bakery as BlocksContent;

  return (
    <>
      <Hero
        image={{
          src: puerto.src,
          alt: "Playa con agua turquesa y bandera argentina flameando",
        }}
        align="center"
      >
        <Image
          src={fsmflogo}
          width={550}
          height={125}
          alt="Logo de la fundacion SAra Maria Furman"
        />
      </Hero>

      <div className="flex flex-col gap-10">
        <section className="flex flex-col px-10 lg:px-28">
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="w-full">
              <h2 className="text-4xl font-bold">
                Quiénes somos, qué hacemos y qué nos mueve.
              </h2>
            </div>
            <BlockRendererClient content={aboutContent} />
          </div>
        </section>
        <section className="bg-foreground-100 py-6">
          <div className="flex flex-col gap-4 px-10 lg:px-28">
            <div>
              <h2 className="text-center text-4xl font-bold">
                La Fundación y su Historia
              </h2>
            </div>
            <BlockRendererClient content={historyContent} />
          </div>
        </section>
        <section>
          <ImageTextRenderer
            variant="defaultFW"
            block={{
              title: "Panificadora solidaria",
              description: <BlockRendererClient content={bakeryContent} />,
              id: 1,
              images: [
                {
                  src: panificadora.src,
                  alt: "Horno de barro con panes al lado",
                  order: 0,
                },
              ],
              variant: "defaultFW",
            }}
          />
        </section>
      </div>
    </>
  );
}
