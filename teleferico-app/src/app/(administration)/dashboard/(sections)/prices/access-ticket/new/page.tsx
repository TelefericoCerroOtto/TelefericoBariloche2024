import { FormContainer } from "@/components";
import Form from "./Form";

const FORM_DESC =
  "Establecé tarifas para el acceso al complejo. Ingresá el tipo de ticket en los distintos idiomas (Español, Ingles, Portugués) y luego completá los campos restantes.";

export default function NewAccessTicketPage() {
  return (
    <FormContainer desc={FORM_DESC}>
      <Form />
    </FormContainer>
  );
}
