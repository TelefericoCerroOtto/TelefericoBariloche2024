import { HoursOverview } from "@/components";
import { HeroSection, InfoSection } from "./_components";

export default function LocationPage() {
  return (
    <div className="flex flex-col items-center">
      <HeroSection />
      <InfoSection />
      <HoursOverview />
    </div>
  );
}
