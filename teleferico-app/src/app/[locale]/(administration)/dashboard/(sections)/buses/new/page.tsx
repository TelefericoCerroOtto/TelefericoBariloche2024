import { FormContainer, FormError } from "@/components";
import Form from "./Form";
import { getStations } from "@/lib/services";

const FORM_DESC =
  "Desde esta sección, podés administrar los viajes de los buses. Asegurarte de que el publico tenga la información actualizada.";

export default async function NewTripPage() {
  const res = await getStations("es-AR");

  if (!res.ok) {
    console.error("Error fetching stations: ", res.data);
    return (
      <FormError message="Ocurrió un error al cargar las estaciones de bus" />
    );
  }

  return (
    <FormContainer desc={FORM_DESC}>
      <Form stations={res.data.data} />
    </FormContainer>
  );
}
