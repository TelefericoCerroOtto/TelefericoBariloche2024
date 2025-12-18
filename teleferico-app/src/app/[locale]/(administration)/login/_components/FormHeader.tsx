import Image from "next/image";
import LogoTeleferico from "@/public/logo.svg";

export default function FormHeader() {
  return (
    <div className="flex flex-col">
      <Image src={LogoTeleferico} alt="Logo de teleferico" />
      <h1 className="text-2xl font-bold">Sistema De Administración</h1>
      <p className="text-lg">Inicie sesión para contniuar</p>
    </div>
  );
}
