import { FormContainer, FormError } from "@/components";
import { getActivityAdapter } from "@/lib/adapters";
import { getActivity } from "@/lib/services";
import type { Locales } from "@/types";
import Form from "./Form";

const FORM_DESC =
  "Establecé tarifas para las distintas actividades. Editá el nombre y los requisitos de la actividad en los distintos idiomas (Español, Inglés, Portugués) y luego completá los campos restantes.";

export default async function EditActivityPage({
  params,
}: Readonly<{
  params: Promise<{ id: string; locale?: Locales }>;
}>) {
  const { id } = await params;
  const res = await getActivity({ documentId: id, locale: "all" });

  if (!res.ok) {
    console.error(res.data);
    return <FormError message="Algo salio mal" />;
  }

  const initialValues = getActivityAdapter(res.data);

  return (
    <FormContainer desc={FORM_DESC}>
      <Form initialValues={initialValues} />
    </FormContainer>
  );
}
