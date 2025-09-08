import { FormContainer } from "@/components";
import Form from "./Form";

const FORM_DESC =
  "Desde esta sección, podés administrar los viajes de los buses. Asegurarte de que el publico tenga la información actualizada.";

export default function NewTravelPage() {
  return (
    <FormContainer desc={FORM_DESC}>
      <Form />
    </FormContainer>
  );
}
