import { FormContainer, FormError } from "@/components";
import { getNewsAdapter } from "@/lib/adapters";
import { getNew } from "@/lib/services";
import Form from "./Form";

const FORM_DESC =
  "Editá la información de la noticia y asegurate de mantener los contenidos sincronizados en todos los idiomas disponibles.";

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getNew({ locale: "all", documentId: id });

  if (!res.ok) {
    console.log(
      `get news with documentId ${id} data error at editing news form page. `,
      res.data,
    );
    return <FormError message="Ocurrió un error al cargar la noticia" />;
  }

  const initialValues = getNewsAdapter(res.data);

  return (
    <FormContainer desc={FORM_DESC}>
      <Form initialValues={initialValues} />
    </FormContainer>
  );
}
