import { BlockRendererClient, TitleDescBlock } from "@/components";
import { Spacer } from "@nextui-org/react";
import { BlocksContent } from "@strapi/blocks-react-renderer";
import data from "./data.json";

// async function getStrapiData() {
//   const res = await fetch("http://localhost:1337/api/rules?locale=es-AR");
//   const data = await res.json();
//   return data;
// }

export default async function PoliciesPage() {
  // const { data } = await getStrapiData();
  // const content: BlocksContent = data[0].rule;
  const content = data as BlocksContent;
  return (
    <>
      <Spacer y={28} />
      <div className="flex w-full flex-col px-28">
        <TitleDescBlock
          title="Reglamento del complejo turístico"
          desc="Conocé las normas que garantizan la seguridad y el disfrute de todos nuestros visitantes. Tu colaboración es esencial para mantener la experiencia en el Cerro Otto segura y memorable para cada persona."
          epigraph="Información Esencial"
          align="start"
        />
        <BlockRendererClient content={content} />
      </div>
    </>
  );
}
