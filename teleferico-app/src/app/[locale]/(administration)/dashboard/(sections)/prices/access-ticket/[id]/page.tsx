import { FormContainer, FormError } from "@/components";
import Form from "./Form";
import { getAccessTicket } from "@/lib/services";
import { getAccessTicketAdapter } from "@/lib/adapters";

const FORM_DESC =
  "Establecé tarifas para el acceso al complejo. Ingresá el tipo de ticket en los distintos idiomas (Español, Ingles, Portugués) y luego completá los campos restantes.";

export default async function EditAccessTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const res = await getAccessTicket({ documentId: id, locale: "all" });

  if (!res.ok) {
    return <FormError message="Algo salio mal" />;
  }

  const initialValues = getAccessTicketAdapter(res.data);

  return (
    <FormContainer desc={FORM_DESC}>
      <Form initialValues={initialValues} />
    </FormContainer>
  );
}
