import { FormContainer } from "@/components";

const FORM_DESC =
  "Desde esta sección, podés crear y editar los usuarios que tendrán acceso a la plataforma de administración y asignar sus roles.";

export default function UserFormLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <FormContainer desc={FORM_DESC}>{children}</FormContainer>;
}
