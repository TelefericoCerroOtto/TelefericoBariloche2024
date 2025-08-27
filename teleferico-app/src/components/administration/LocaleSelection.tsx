import { i18n } from "@/i18n";
import { Select, SelectItem, SharedSelection } from "@heroui/react";
import { Languages } from "lucide-react";

type LocaleItem = { key: (typeof i18n.locales)[number]; label: string };

const items: LocaleItem[] = [
  { key: i18n.locales[0], label: "Español" },
  { key: i18n.locales[1], label: "Inglés" },
  { key: i18n.locales[2], label: "Portugés" },
];

interface Props {
  selectedKeys: SharedSelection;
  // eslint-disable-next-line no-unused-vars
  handleSelectionChange: (keys: SharedSelection) => void;
}

export default function LocaleSelection(props: Props) {
  const { selectedKeys, handleSelectionChange } = props;

  return (
    <div className="flex items-center gap-3">
      <Languages />
      <p>Editando en:</p>
      <Select
        variant="underlined"
        className="w-[120px]"
        size="sm"
        disallowEmptySelection
        items={items}
        selectedKeys={selectedKeys}
        onSelectionChange={handleSelectionChange}
      >
        {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
      </Select>
    </div>
  );
}

// TODO: Reemplazar las selecciones de locales en los formularios por este componente en conjunto con useLocaleSelection
