import {
  FaqSection,
  HeroSection,
  ImageTextSection,
  InfoSection,
  PosterSection,
  ServiceButton,
} from "./_components";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <HeroSection />
      <InfoSection />
      <ImageTextSection />
      <PosterSection />
      <FaqSection />
      <ServiceButton />
    </div>
  );
}
