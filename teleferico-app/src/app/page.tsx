import { Cards, Poster, Hero } from "./_components";
import gondolas from "@/public/gondolas.jpg";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <Hero />
      <Cards />
      <Poster
        imageSrc={gondolas.src}
        description="Lorem ipsum"
        title="Gondolas Teleferico"
      />
    </div>
  );
}
