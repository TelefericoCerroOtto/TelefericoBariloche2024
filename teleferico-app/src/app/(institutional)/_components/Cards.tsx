import { Button, Card, CardFooter, CardHeader, Image } from "@nextui-org/react";
import trineoImg from "@/public/trineo.jpg";
import tirolesaImg from "@/public/tirolesa.jpg";
import raquetasImg from "@/public/raquetas.jpg";

export default function Cards() {
  const items = [
    {
      epigraph: "Invierno",
      title: "Trineo",
      desc: "Disfruta de esta actividad en invierno.",
      image: trineoImg.src,
    },
    {
      epigraph: "Todo el año",
      title: "Tirolesa",
      desc: "Disfruta de esta actividad todo el año.",
      image: tirolesaImg.src,
    },
    {
      epigraph: "Invierno",
      title: "Caminata con raquetas",
      desc: "Disfruta de esta actividad en invierno.",
      image: raquetasImg.src,
    },
  ];

  return (
    <div className="grid max-w-[1000px] grid-cols-12 grid-rows-2 gap-4 px-8">
      {items.map((item, index) => (
        <Card
          key={index}
          isFooterBlurred
          className="col-span-12 h-[300px] w-full sm:col-span-4"
        >
          <CardHeader className="absolute top-1 z-10 flex-col items-start">
            <p className="text-tiny font-bold uppercase text-slate-700">
              {item.epigraph}
            </p>
            <h4 className="text-2xl font-medium text-black">{item.title}</h4>
          </CardHeader>
          <Image
            removeWrapper
            alt="Card example background"
            className="z-0 h-full w-full -translate-y-6 scale-125 object-cover hover:scale-[1.3]"
            src={item.image}
          />
          <CardFooter className="absolute bottom-0 z-10 justify-between border-t-1 border-zinc-100/50 bg-white/30">
            <div>
              <p className="text-tiny text-black">{item.desc}</p>
            </div>
            <Button
              className="bg-red-600 text-tiny text-white hover:bg-red-500"
              radius="full"
              size="sm"
            >
              Ver más
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
