import { Hero, ImageTextSection, PageWrapper } from "@/components";
import lagodesdecumbre from "@/public/lagodesdecumbre.jpg";
import { items } from "./data";

export default function ActivitiesPage() {
  return (
    <PageWrapper>
      <Hero
        image={{
          src: lagodesdecumbre.src,
          alt: "Lago Nahuel Huapi desde la cumbre del Cerro Otto con una cabaña",
        }}
        title="Descubrí Todo Lo Que Podés Hacer"
        description="Cada rincón ofrece una experiencia única para disfrutar del entorno natural y la belleza de Bariloche. Ya sea buscando relajación o aventura, el lugar invita a explorar y vivir momentos inolvidables en un paisaje de montaña incomparable."
      />
      <ImageTextSection items={items} />
    </PageWrapper>
  );
}

// interface Respon {
//   data: [
//     {
//       id: number;
//       documentId: string;
//       route: string;
//       createdAt: string;
//       updatedAt: string;
//       publishedAt: string;
//       locale: string;
//       page_contents: Array<{
//         id: number;
//         documentId: string;
//         content: string;
//         tag: string;
//         createdAt: string;
//         updatedAt: string;
//         publishedAt: string;
//         locale: string;
//         key: string;
//       }>;
//       localizations: [];
//     },
//   ];
//   meta: {
//     pagination: {
//       page: number;
//       pageSize: number;
//       pageCount: number;
//       total: number;
//     };
//   };
// }

// export default async function ActivitiesPage() {
//   const res = await (
//     await fetch("http://localhost:1337/api/pages?locale=es-AR&populate=*")
//   ).json();
//   // console.log(res);
//   const { data } = res as Respon;
//   console.log(data[0].page_contents);

//   return (
//     <div>
//       <h1>{data[0].page_contents[0].content}</h1>
//       <p>{data[0].page_contents[1].content}</p>
//     </div>
//   );
// }
