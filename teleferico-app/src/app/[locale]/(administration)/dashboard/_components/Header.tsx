import { SidebarTrigger } from "@/components/ui/Sidebar";
import type { Session } from "next-auth";
import HeaderTitle from "./HeaderTitle";
import ProfileButton from "./ProfileButton";
import ServiceButton from "./ServiceButton";

export function Header({
  showProfile,
  showServiceStateControl,
  user,
}: {
  showProfile: boolean;
  showServiceStateControl: boolean;
  user: Session["user"];
}) {
  return (
    <header className="flex h-[75px] w-full min-w-0 items-center justify-between border-b-1 p-3">
      <HeaderTitle />
      <SidebarTrigger className="block md:hidden" />
      <div className="flex shrink-0 gap-2">
        {showServiceStateControl ? (
          <ServiceButton currentRole={user.role.name} />
        ) : null}
        {showProfile ? <ProfileButton user={user} /> : null}
      </div>
    </header>
  );
}
