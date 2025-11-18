import { TableToolbarContainer } from "@/components";
import { ADMIN_ROUTES } from "@/utils";

export default function Filters() {
  return (
    <TableToolbarContainer
      linkHref={ADMIN_ROUTES.NEW_FAQ}
      title="Nueva noticia"
    >
      <></>
    </TableToolbarContainer>
  );
}
