import { SidebarTrigger } from "@/components/ui/Sidebar";
import { getSession } from "@/lib/auth/get-session";
import HeaderTitle from "./HeaderTitle";
import ProfileButton from "./ProfileButton";
import ServiceButton from "./ServiceButton";

export async function Header() {
  const session = await getSession();

  return (
    <header className="flex h-[75px] w-full min-w-0 items-center justify-between border-b-1 p-3">
      <HeaderTitle />
      <SidebarTrigger className="block md:hidden" />
      <div className="flex shrink-0 gap-2">
        <ServiceButton />
        <ProfileButton user={session.user} />
      </div>
    </header>
  );
}
