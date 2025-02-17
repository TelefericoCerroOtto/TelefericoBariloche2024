import { Hero, TitleDescBlock } from "@/components";
import gondolasnevadas from "@/public/gondolasnevadas.jpg";
import {
  ActivitiesTable,
  BusesTable,
  PricingTable,
  ZonesTable,
} from "./_components";
import { Spacer } from "@nextui-org/react";

export default function PricingSchedulesPage() {
  return (
    <>
      <Hero
        content={{
          cover: {
            src: gondolasnevadas.src,
            alt: "Dos gondolas con paisaje nevado de fondo",
          },
          title: "Tarifas y horarios",
          description:
            "Explorá nuestras opciones de tarifas y servicios para disfrutar al máximo de tu aventura en el Cerro Otto.",
        }}
      />
      <div className="flex w-full flex-col px-10 sm:px-20 lg:px-40">
        <TitleDescBlock
          title="Tarifas de ascenso, descenso y actividades"
          desc="Subí a Nuevas Alturas y Disfrutá de Increíbles Experiencias con la mejor vista de la Patagonia, rodeado de actividades emocionantes y paisajes increíbles."
          align="start"
        />
        <PricingTable />
        <Spacer y={10} />
        <ActivitiesTable />
        <Spacer y={16} />
        <TitleDescBlock
          title="Horarios del complejo y sus servicios"
          desc="Subí a Nuevas Alturas y Disfrutá de Increíbles Experiencias con la mejor vista de la Patagonia, rodeado de actividades emocionantes y paisajes increíbles."
          align="start"
        />
        <ZonesTable />
        <Spacer y={10} />
        <BusesTable />
      </div>
    </>
  );
}
