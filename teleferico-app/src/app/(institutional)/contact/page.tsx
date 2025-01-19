import { ContactInfo, TitleDescBlock } from "@/components";
import { Spacer } from "@nextui-org/react";
import { Form } from "./_components";

export default function ContactPage() {
  return (
    <>
      <Spacer y={28} />
      <div className="flex w-full flex-col px-28">
        <TitleDescBlock
          title="Medios De Contacto"
          desc="Queremos escucharte y responder a todas tus dudas"
          epigraph="Contactanos fácil"
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
