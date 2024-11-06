import gondolas from "@/public/gondolas.jpg";
import { Cards, Hero, Poster, State } from "./_components";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      <Hero />
      <State />
      <Cards />
      <Poster
        imageSrc={gondolas.src}
        description="Lorem ipsum dolor sit amet, consectetur adipisicing elit. Officia, hic facilis doloribus ex facere"
        title="Gondolas Teleferico"
      />
    </div>
  );
}
