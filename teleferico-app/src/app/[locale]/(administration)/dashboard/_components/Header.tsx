import { SidebarTrigger } from "@/components/ui/Sidebar";
import HeaderTitle from "./HeaderTitle";
import ProfileButton from "./ProfileButton";
import ServiceButton from "./ServiceButton";
import { getSession } from "@/utils";

export async function Header() {
  const session = await getSession();

  return (
    <header className="flex h-[75px] w-full items-center justify-between border-b-1 p-3">
      <HeaderTitle />
      <SidebarTrigger className="block md:hidden" />
      <div className="flex gap-2">
        <ServiceButton />
        <ProfileButton user={session.user} />
      </div>
    </header>
  );
}
