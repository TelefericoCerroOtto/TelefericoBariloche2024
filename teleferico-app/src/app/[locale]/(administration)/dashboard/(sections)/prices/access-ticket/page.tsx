// app/form/page.tsx
import { ADMIN_ROUTES } from "@/utils";
import { redirect } from "next/navigation";

export default function FormRedirectPage() {
  redirect(ADMIN_ROUTES.NEW_ACCESS_TICKET);
}
