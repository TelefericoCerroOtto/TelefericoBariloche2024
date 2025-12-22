import Image from "next/image";
import cabania from "@/public/cabañaespejosnevada.jpg";

export default function Portrait() {
  return (
    <div className="relative h-full w-3/4">
      <Image
        src={cabania.src}
        alt="Cabanias nevadas"
        fill
        className="object-cover"
      />
    </div>
  );
}
