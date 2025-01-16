import { ImageTextRenderer } from "@/components";
import { items } from "./data";

export default function InfoSection() {
  return (
    <section className="mb-14 flex flex-col items-center">
      {items.map((item) => (
        <ImageTextRenderer key={item.id} variant={item.variant} block={item} />
      ))}
    </section>
  );
}
