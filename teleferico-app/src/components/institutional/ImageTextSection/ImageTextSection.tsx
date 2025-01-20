import ImageTextRenderer from "./ImageTextRenderer";
import type { ImageTextBlock } from "@/types/api";

interface Props {
  items: ImageTextBlock[];
}

export default function ImageTextSection(props: Props) {
  const { items } = props;

  return (
    <section className="mb-14 flex flex-col items-center">
      {items.map((item) => (
        <ImageTextRenderer key={item.id} variant={item.variant} block={item} />
      ))}
    </section>
  );
}
