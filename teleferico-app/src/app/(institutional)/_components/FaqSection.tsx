import Link from "next/link";
import { ROUTES } from "@/utils/routes.const";

const items = [
  {
    id: 1,
    question: "¿El pasaje es reembolsable?",
    answer:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam blandit, urna auctor fermentum condimentum, eros leo consectetur odio, nec commodo est mauris vel nunc. Curabitur non sapien ornare, sagittis augue eu, faucibus elit. ",
  },
  {
    id: 2,
    question: "¿Qué pasa si pierdo mi pasaje o me lo roban?",
    answer:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam blandit, urna auctor fermentum condimentum, eros leo consectetur odio, nec commodo est mauris vel nunc. Curabitur non sapien ornare, sagittis augue eu, faucibus elit. ",
  },
  {
    id: 3,
    question: "¿Qué sucede si las el clima afecta el servicio?",
    answer:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam blandit, urna auctor fermentum condimentum, eros leo consectetur odio, nec commodo est mauris vel nunc. Curabitur non sapien ornare, sagittis augue eu, faucibus elit. ",
  },
  {
    id: 4,
    question: "¿Puedo consumir alimentos dentro de las góndolas?",
    answer:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam blandit, urna auctor fermentum condimentum, eros leo consectetur odio, nec commodo est mauris vel nunc. Curabitur non sapien ornare, sagittis augue eu, faucibus elit. ",
  },
  {
    id: 5,
    question: "¿Puedo ascender con mi mascota?",
    answer:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam blandit, urna auctor fermentum condimentum, eros leo consectetur odio, nec commodo est mauris vel nunc. Curabitur non sapien ornare, sagittis augue eu, faucibus elit. ",
  },
  {
    id: 6,
    question: "¿Los menores de edad pueden ascender solos?",
    answer:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam blandit, urna auctor fermentum condimentum, eros leo consectetur odio, nec commodo est mauris vel nunc. Curabitur non sapien ornare, sagittis augue eu, faucibus elit. ",
  },
  {
    id: 7,
    question: "¿Las personas con discapacidad tienen algún beneficio?",
    answer:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam blandit, urna auctor fermentum condimentum, eros leo consectetur odio, nec commodo est mauris vel nunc. Curabitur non sapien ornare, sagittis augue eu, faucibus elit. ",
  },
  {
    id: 8,
    question: "¿Qué actividades están disponibles en invierno?",
    answer:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam blandit, urna auctor fermentum condimentum, eros leo consectetur odio, nec commodo est mauris vel nunc. Curabitur non sapien ornare, sagittis augue eu, faucibus elit. ",
  },
];

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="text-center text-2xl font-bold capitalize md:text-start">
        {q}
      </p>
      <p className="text-center md:text-start">{a}</p>
    </div>
  );
}

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
        {items.map((item) => (
          <Faq q={item.question} a={item.answer} key={item.id} />
        ))}
      </div>
    </section>
  );
}
