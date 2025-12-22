import { FormContainer } from "@/components";
import Form from "./Form";

const FORM_DESC =
  "Establecé tarifas para las distintas actividades. Ingresá el nombre y los requisitos de la actividad en los distintos idiomas (Español, Inglés, Portugués) y luego completá los campos restantes.";

export default function NewActivityPage() {
  return (
    <FormContainer desc={FORM_DESC}>
      <Form />
    </FormContainer>
  );
}
