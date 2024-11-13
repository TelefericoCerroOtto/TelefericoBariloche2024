interface Respon {
  data: [
    {
      id: number;
      documentId: string;
      route: string;
      createdAt: string;
      updatedAt: string;
      publishedAt: string;
      locale: string;
      page_contents: Array<{
        id: number;
        documentId: string;
        content: string;
        tag: string;
        createdAt: string;
        updatedAt: string;
        publishedAt: string;
        locale: string;
        key: string;
      }>;
      localizations: [];
    },
  ];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export default async function ActivitiesPage() {
  const res = await (
    await fetch("http://localhost:1337/api/pages?locale=es-AR&populate=*")
  ).json();
  // console.log(res);
  const { data } = res as Respon;
  console.log(data[0].page_contents);

  return (
    <div>
      <h1>{data[0].page_contents[0].content}</h1>
      <p>{data[0].page_contents[1].content}</p>
    </div>
  );
}
