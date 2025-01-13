import bus from "@/public/busInfo.png";
import cerro from "@/public/cerroInfo.png";
import gondola from "@/public/gondolaInfo.png";
import Image from "next/image";

const items = [
  {
    id: 1,
    icon: { src: gondola.src, alt: "icono de gondola" },
    title: "Horarios de la base",
    desc: (
      <p className="text-center">
        El complejo en la Base (km 5) abre de 10:00 a 16:30, y es el punto de
        partida de tu aventura. Comprá tu boleto de ingreso en la Base y
        disfrutá de un viaje espectacular hasta la cumbre.
      </p>
    ),
  },
  {
    id: 2,
    icon: { src: cerro.src, alt: "icono de cerro" },
    title: "Horarios de la cumbre",
    desc: (
      <p className="text-center">
        La magia continúa en la Cumbre, donde podés disfrutar de la{" "}
        <span className="font-bold">famosa confitería giratoria</span> y las
        mejores vistas hasta las 17:45. Tomate tu tiempo para relajarte y
        admirar el paisaje.
      </p>
    ),
  },
  {
    id: 3,
    icon: { src: bus.src, alt: "icono de bus" },
    title: "Horarios de los buses",
    desc: (
      <p className="text-center">
        Los buses parten desde el centro hacia la Base cada hora,{" "}
        <span className="font-bold">desde las 10:00 hasta las 16:00.</span> Los
        regresos desde la Base al centro comienzan a las{" "}
        <span className="font-bold">
          11:15 y continúan cada hora hasta las 18:15.
        </span>
      </p>
    ),
  },
];

export default function HoursOverviewItems() {
  return (
    <div className="mb-12 flex max-w-[1376px] flex-col items-center gap-10 px-8 md:px-14 lg:flex-row">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex max-w-[450px] flex-col items-center gap-3 text-center"
        >
          <Image
            src={item.icon.src}
            alt={item.icon.alt}
            width={80}
            height={80}
          />
          <h4 className="text-2xl font-bold">{item.title}</h4>
          {item.desc}
        </div>
      ))}
    </div>
  );
}
