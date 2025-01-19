import { TitleDescBlock } from "@/components";
import { Spacer } from "@nextui-org/react";
import { Form } from "./_components";

export default function JobsPage() {
  return (
    <>
      <Spacer y={28} />
      <div className="flex w-full flex-col px-28">
        <TitleDescBlock
          title="¡Sumate a Nuestro Equipo!"
          desc="Explorá oportunidades de crecimiento y formá parte de un ambiente de trabajo único, rodeado de la belleza de la Patagonia."
          epigraph="Esperamos tu postulación"
          align="start"
        />
        <div className="flex flex-col gap-8 lg:flex-row">
          <Form />
          <TitleDescBlock
            title="Informacion de contacto"
            desc={
              <>
                <span className="block">
                  <strong>Direccion:</strong> Av. De los Pioneros KM 5.000, San
                  Carlos De Bariloche, Rio Negro, Argentina
                </span>
                <span className="block">
                  <strong>Telefono:</strong> +54 294 4441 1031
                </span>
              </>
            }
            align="start"
          />
        </div>
      </div>
    </>
  );
}
