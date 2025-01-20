import { FeaturedNew, Grid } from "./_components";
import { news } from "./data";

export default function NewsPage() {
  return (
    <>
      <FeaturedNew news={news.filter((item) => item.featured)[0]} />
      <Grid news={news} title="Todas las noticias" />
    </>
  );
}
