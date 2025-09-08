import { FormContainer, FormError } from "@/components";
import { getZoneAdapter } from "@/lib/adapters";
import { getZone } from "@/lib/services";
import Form from "./Form";

const FORM_DESC =
  "Modificá los horarios de las instalaciones para mantener los tiempos de apertura y cierre actualizados. ";

export default async function EditZonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const res = await getZone({ documentId: id, locale: "all" });

  if (!res.ok) {
    return <FormError message="Algo salio mal" />;
  }

  const initialValues = getZoneAdapter(res.data);
  console.log("initialValues: ", initialValues);

  return (
    <FormContainer desc={FORM_DESC}>
      <Form initialValues={initialValues} />
    </FormContainer>
  );
}
