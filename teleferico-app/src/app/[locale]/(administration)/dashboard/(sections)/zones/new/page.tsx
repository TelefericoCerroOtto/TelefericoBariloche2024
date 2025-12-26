import { FormContainer } from "@/components";
import Form from "./Form";

const FORM_DESC =
  "Creá una zona y agregale un horario para que el público la vea reflejada en los horarios del sitio.";

export default async function EditZonePage() {
  return (
    <FormContainer desc={FORM_DESC}>
      <Form />
    </FormContainer>
  );
}
