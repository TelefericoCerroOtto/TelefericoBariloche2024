import type { ImageTextBlock } from "@/types";
import ImageTextRenderer from "./ImageTextRenderer";

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
