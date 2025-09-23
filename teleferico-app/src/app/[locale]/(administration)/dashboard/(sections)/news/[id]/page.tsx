import { FormContainer, FormError } from "@/components";
import { getNewsAdapter } from "@/lib/adapters";
import { getNews } from "@/services";
import NewsForm from "../_components/NewsForm";
import { deleteNewsAction, updateNewsAction } from "./actions";

const FORM_DESC =
  "Editá la información de la noticia y asegurate de mantener los contenidos sincronizados en todos los idiomas disponibles.";

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getNews(id, { locale: "all" });

  if (!res.ok) {
    return <FormError message="Ocurrió un error al cargar la noticia" />;
  }

  const initialValues = getNewsAdapter(res.data);

  return (
    <FormContainer desc={FORM_DESC}>
      <NewsForm
        initialValues={initialValues}
        onSubmitAction={updateNewsAction}
        onDeleteAction={deleteNewsAction}
      />
    </FormContainer>
  );
}
