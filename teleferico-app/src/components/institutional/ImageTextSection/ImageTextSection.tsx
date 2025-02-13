import type { ImageTextBlock } from "@/types";
import ImageTextRenderer from "./ImageTextRenderer";

interface Props {
  items: ImageTextBlock[];
}

export default function ImageTextSection(props: Props) {
  const { items } = props;

  return (
    <section className="mb-14">
      {items.map((item) => (
        <ImageTextRenderer key={item.id} block={item} />
      ))}
    </section>
  );
}
