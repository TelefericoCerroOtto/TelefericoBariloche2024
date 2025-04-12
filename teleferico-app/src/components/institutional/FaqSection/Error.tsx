import { Alert } from "@nextui-org/react";

export default function Error() {
  return (
    <Alert
      description="Ocurrio un error al recuperar las preguntas"
      color="danger"
    />
  );
}
