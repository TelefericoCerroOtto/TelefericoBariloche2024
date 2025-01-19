import Link from "next/link";
import { ROUTES } from "@/utils/routes.const";
import { Faq } from "@/components";
import { faqs } from "./data";

export default function FaqSection() {
  return (
    <section className="flex w-full flex-col items-center px-6 md:px-6 lg:px-16">
      <div className="mb-7 flex w-full max-w-[860px] flex-col items-center">
        <h3 className="text-center text-4xl font-bold">Preguntas Frecuentes</h3>
        <p className="text-center">
          Acá encontrarás respuestas rápidas a las inquietudes más comunes sobre{" "}
          <span className="font-bold">
            nuestro reglamento, actividades y servicios.
          </span>{" "}
          Si tenés alguna pregunta adicional, visitá nuestras{" "}
          <Link href={ROUTES.INFO} className="text-custom-red hover:underline">
            Preguntas Frecuentes.
          </Link>
        </p>
      </div>
      <div className="grid max-w-[1536px] grid-cols-1 gap-y-6 md:grid-cols-2 md:gap-x-14">
        {faqs.map((item) => (
          <Faq q={item.question} a={item.answer} key={item.id} />
        ))}
      </div>
    </section>
  );
}
