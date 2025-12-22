import { FormContainer, FormError } from "@/components";
import { getFaqAdapter } from "@/lib/adapters";
import { getFaq } from "@/lib/services";
import Form from "./Form";

const FORM_DESC =
  "Aquí puedes editar una Pregunta Frecuente para corregir la información que los usuarios ven al buscar respuestas.";

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getFaq({ locale: "all", documentId: id });

  if (!res.ok) {
    console.log(
      `get news with documentId ${id} data error at editing news form page. `,
      res.data,
    );
    return <FormError message="Ocurrió un error al cargar la noticia" />;
  }

  const initialValues = getFaqAdapter(res.data);

  return (
    <FormContainer desc={FORM_DESC}>
      <Form initialValues={initialValues} />
    </FormContainer>
  );
}
