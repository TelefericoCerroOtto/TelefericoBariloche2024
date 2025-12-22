import { TableToolbarContainer } from "@/components";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";

export default function Filters() {
  return (
    <TableToolbarContainer
      linkHref={ADMIN_ROUTES.NEW_FAQ}
      title="Nueva pregunta frecuente"
    >
      <></>
    </TableToolbarContainer>
  );
}
