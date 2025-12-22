import { FormContainer } from "@/components";
import Form from "./Form";

const FORM_DESC =
  "Gestioná las noticias publicadas en el sitio. Completá los campos requeridos y recordá cargar el contenido en formato JSON de Strapi.";

export default function NewNewsPage() {
  return (
    <FormContainer desc={FORM_DESC}>
      <Form />
    </FormContainer>
  );
}
