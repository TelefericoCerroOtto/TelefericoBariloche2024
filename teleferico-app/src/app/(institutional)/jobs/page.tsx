import { ContactInfo, TitleDescBlock } from "@/components";
import { Spacer } from "@nextui-org/react";
import { Form } from "./_components";

export default function JobsPage() {
  return (
    <>
      <Spacer y={28} />
      <div className="flex w-full flex-col px-10 lg:px-28">
        <TitleDescBlock
          title="¡Sumate a Nuestro Equipo!"
          desc="Explorá oportunidades de crecimiento y formá parte de un ambiente de trabajo único, rodeado de la belleza de la Patagonia."
          epigraph="Esperamos tu postulación"
          align="start"
        />
        <div className="flex flex-col gap-8 lg:flex-row">
          <Form />
          <ContactInfo />
        </div>
      </div>
    </>
  );
}
