import { Faq, TitleDescBlock } from "@/components";
import { Spacer } from "@nextui-org/react";
import { faqs } from "../_components/data";

export default function FAQSPage() {
  return (
    <>
      <Spacer y={28} />
      <div className="flex w-full flex-col px-10 lg:px-28">
        <TitleDescBlock
          title="Preguntas Frecuentes"
          desc="¿Tenés dudas? Acá respondemos las consultas más comunes para que puedas disfrutar tu experiencia al máximo en el Teleférico Cerro Otto."
          epigraph="¿Cómo podemos ayudarte?"
          align="start"
        />
        <div className="grid max-w-[1536px] grid-cols-1 gap-y-6 md:grid-cols-2 md:gap-x-14">
          {faqs.map((item) => (
            <Faq q={item.question} a={item.answer} key={item.id} />
          ))}
        </div>
      </div>
    </>
  );
}
