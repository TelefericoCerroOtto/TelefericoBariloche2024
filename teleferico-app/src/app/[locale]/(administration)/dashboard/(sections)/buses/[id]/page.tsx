import { FormContainer, FormError } from "@/components";
import Form from "./Form";
import { getBusTrip, getStations } from "@/lib/services";
import { getBusTripAdapter } from "@/lib/adapters";

const FORM_DESC =
  "Desde esta sección, podés administrar los viajes de los buses. Asegurarte de que el publico tenga la información actualizada.";

export default async function NewTripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const documentId = (await params).id;

  const stationsRes = await getStations("es-AR");
  if (!stationsRes.ok) {
    console.error("Error fetching stations: ", stationsRes.data);
    return (
      <FormError message="Ocurrió un error al cargar las estaciones de bus" />
    );
  }

  const busTripRes = await getBusTrip(documentId, "es-AR");
  if (!busTripRes.ok) {
    console.error("Error fetching bus trip: ", busTripRes.data);
    return (
      <FormError message="Ocurrió un error al cargar la información del viaje" />
    );
  }

  const initialValues = getBusTripAdapter(busTripRes.data);

  return (
    <FormContainer desc={FORM_DESC}>
      <Form stations={stationsRes.data.data} initialValues={initialValues} />
    </FormContainer>
  );
}
