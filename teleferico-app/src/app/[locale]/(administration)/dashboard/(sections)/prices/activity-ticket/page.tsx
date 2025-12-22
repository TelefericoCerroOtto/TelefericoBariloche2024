import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import { redirect } from "next/navigation";

export default function FormRedirectPage() {
  redirect(ADMIN_ROUTES.NEW_ACTIVITY_TICKET);
}
