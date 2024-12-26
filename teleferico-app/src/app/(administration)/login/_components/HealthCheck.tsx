"use client";

import { ButtonDos } from "@/components";
import { Spinner } from "@nextui-org/react";
import { useState } from "react";

export default function HelathCheck() {
  const [isLoading, setIsLoading] = useState(false);

  const handleCLick = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/healthCheck", {
        method: "GET",
      });
      const data = await res.json();
      console.log("handle click data", data);
    } catch (error) {
      console.log("handle click error", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ButtonDos onClick={handleCLick} disabled={isLoading}>
      {isLoading ? <Spinner size="sm" color="primary" /> : "Helath Check"}
    </ButtonDos>
  );
}
