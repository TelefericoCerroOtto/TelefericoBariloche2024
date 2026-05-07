"use client";

import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  User,
} from "@heroui/react";
import { LogOut } from "lucide-react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";

interface Props {
  user: Session["user"];
}

export default function ProfileButton(props: Props) {
  const { user } = props;
  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Avatar
          as="button"
          className="transition-transform"
          src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
        />
      </DropdownTrigger>
      <DropdownMenu aria-label="Profile Actions" variant="flat">
        <DropdownItem
          key="profile"
          className="h-14 cursor-default gap-2"
          isReadOnly
          showDivider
        >
          <User
            name={`${user.name} ${user.surname}`}
            description={`@${user.username}`}
            classNames={{
              name: "text-default-600",
              description: "text-default-500",
            }}
            avatarProps={{
              size: "sm",
              src: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
            }}
          />
        </DropdownItem>

        <DropdownItem
          key="logout"
          color="danger"
          startContent={<LogOut />}
          onPress={() => signOut({ redirectTo: "/login" })}
        >
          Cerrar sesión
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
