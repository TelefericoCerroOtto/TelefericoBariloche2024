import { ImageTextSection, PageWrapper } from "@/components";
import {
  FaqSection,
  HeroSection,
  InfoSection,
  PosterSection,
  ServiceButton,
} from "./_components";
import { items } from "./data";

export default function Home() {
  return (
    <PageWrapper>
      <HeroSection />
      <InfoSection />
      <ImageTextSection items={items} />
      <PosterSection />
      <FaqSection />
      <ServiceButton />
    </PageWrapper>
  );
}
