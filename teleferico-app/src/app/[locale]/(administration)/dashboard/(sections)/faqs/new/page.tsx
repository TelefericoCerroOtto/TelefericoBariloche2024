import { FormContainer } from "@/components";
import Form from "./Form";

const FORM_DESC =
  "Aquí puedes crear una nueva Pregunta Frecuente para que los usuarios puedan encontrar respuestas rápidamente.";

export default function NewFaqPage() {
  return (
    <FormContainer desc={FORM_DESC}>
      <Form />
    </FormContainer>
  );
}
