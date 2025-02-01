import { New } from "@/types";
import Card from "./Card";

interface Props {
  title: string;
  news: New[];
}

export default function Grid(props: Props) {
  const { news, title } = props;
  return (
    <div className="flex w-full flex-col gap-6 px-10 sm:px-20 lg:px-40">
      <h2 className="text-4xl font-bold">{title}</h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {news.map((item) => (
          <Card key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
