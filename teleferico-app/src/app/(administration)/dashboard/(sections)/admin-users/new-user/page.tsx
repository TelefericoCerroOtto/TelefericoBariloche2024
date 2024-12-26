import { FormContainer } from "@/components";
import Form from "./Form";

const FORM_DESC =
  "Desde esta sección, podés crear y editar los usuarios que tendrán acceso a la plataforma de administración y asignar sus roles.";

export default function NewUserPage() {
  return (
    <FormContainer desc={FORM_DESC}>
      <Form />
    </FormContainer>
  );
}
