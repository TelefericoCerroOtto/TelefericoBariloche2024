import { FormError } from "@/components";
import { getRoles } from "@/lib/services";
import { getSession } from "@/utils/auth";
import Form from "./_components/Form";

export default async function NewUserPage() {
  const session = await getSession();
  const resRoles = await getRoles(session.jwt);

  if (resRoles.ok) return <Form roles={resRoles.data} />;
  return <FormError message="Ocurrio un error al solicitar los roles" />;
}
