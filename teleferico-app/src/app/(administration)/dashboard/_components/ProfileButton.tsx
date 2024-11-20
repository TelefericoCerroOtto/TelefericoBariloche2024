"use client";

import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  User,
} from "@nextui-org/react";
import { LogOut } from "lucide-react";

export default function ProfileButton() {
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
            name="Junior Garcia"
            description="@jrgarciadev"
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

        <DropdownItem key="logout" color="danger" startContent={<LogOut />}>
          Cerrar sesión
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
