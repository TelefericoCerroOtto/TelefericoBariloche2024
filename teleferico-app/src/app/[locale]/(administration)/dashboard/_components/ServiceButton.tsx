"use client";

import { DropdownCablecarMenu } from "@/components";
import { Button } from "@heroui/react";
import { CableCar } from "lucide-react";

export default function ServiceButton() {
  return (
    <DropdownCablecarMenu>
      {(isLoading) => (
        <Button
          className="bg-green-100 text-green-900 outline-none hover:bg-green-300"
          radius="full"
          startContent={<CableCar />}
          isDisabled={isLoading}
        >
          Estado del servicio
        </Button>
      )}
    </DropdownCablecarMenu>
  );
}
