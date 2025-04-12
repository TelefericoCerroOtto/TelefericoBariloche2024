import { FormError } from "@/components";
import { getRoles, getUserData } from "@/lib/services";
import { getSession } from "@/utils/auth";
import Form from "./Form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const session = await getSession();
  const resUser = await getUserData(id, session.jwt);
  const resRoles = await getRoles(session.jwt);

  if (resUser.ok) {
    if (resRoles.ok) return <Form user={resUser.data} roles={resRoles.data} />;
    return <FormError message="Ocurrio un error al solicitar los roles" />;
  } else {
    return (
      <FormError
        message={`Ocurrio un error al solicitar la informacion del usuario con id: ${id}`}
      />
    );
  }
}
