import { TitleDescBlock } from "@/components";

export default function ContactInfo() {
  return (
    <TitleDescBlock
      title="Informacion de contacto"
      desc={
        <>
          <span className="block">
            <strong>Direccion:</strong> Av. De los Pioneros KM 5.000, San Carlos
            De Bariloche, Rio Negro, Argentina
          </span>
          <span className="block">
            <strong>Telefono:</strong> +54 294 4441 1031
          </span>
        </>
      }
      align="start"
    />
  );
}
