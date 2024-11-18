import HeaderTitle from "./HeaderTitle";
import ProfileButton from "./ProfileButton";
import ServiceButton from "./ServiceButton";

export function Header() {
  return (
    <header className="flex h-[75px] w-full items-center justify-between border-b-1 p-3">
      <HeaderTitle />
      <div className="flex gap-2">
        <ServiceButton />
        <ProfileButton />
      </div>
    </header>
  );
}
