import Image from "next/image";
import clockIilustration from "@/public/oc-time-flies.svg";

export default async function DashboardPage() {
  return (
    <div className="w-max-[1350px] flex w-full flex-col-reverse items-center px-10 md:h-[400px] md:flex-row">
      <div className="flex flex-col gap-3">
        <p className="text-custom-red">Hola Manuel</p>
        <h2 className="text-4xl font-bold">
          Bienvenido al Panel de Administración
        </h2>
        <p className="font-light">
          Este panel de control está diseñado para{" "}
          <span className="font-bold">facilitar el trabajo del equipo,</span>{" "}
          ofreciendo herramientas prácticas para cumplir funciones de
          administración, reclutamiento y gestión de contenido multimedia. Cada
          usuario podrá acceder a los recursos necesarios para desempeñar sus
          tareas.
        </p>
      </div>
      <Image
        src={clockIilustration}
        alt="ilustracion vectorizada reloj"
        width={400}
      />
    </div>
  );
}
