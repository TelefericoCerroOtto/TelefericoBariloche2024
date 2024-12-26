import { FormContainer } from "@/components";
import Form from "./Form";

const FORM_DESC =
  "Modificá los horarios de las instalaciones para mantener los tiempos de apertura y cierre actualizados. ";

export default function EditZonePage() {
  return (
    <FormContainer desc={FORM_DESC}>
      <Form />
    </FormContainer>
  );
}
