import { ImageTextSection } from "@/components";
import PageContentRenderer from "@/components/administration/PageContentRenderer";
import { getHomePageContent } from "@/lib/services/pages";
import {
  FaqSection,
  HeroSection,
  InfoSection,
  PosterSection,
} from "./_components";
import { items } from "./data";

export default async function Home() {
  const res = await getHomePageContent();
  if (!res.ok) return <div>Fallback data</div>;

  const blocks = res.data.data[0].blocks;

  return (
    <>
      <HeroSection />
      <InfoSection />
      <ImageTextSection items={items} />
      <PosterSection />
      <FaqSection />
      {blocks.map((block) => (
        <PageContentRenderer block={block} key={block.id} />
      ))}
    </>
  );
}
