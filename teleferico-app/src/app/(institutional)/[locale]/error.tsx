"use client"; // Error boundaries must be Client Components

import { ButtonDos } from "@/components";
import { Alert, Spacer } from "@nextui-org/react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    // TODO: Navbar is not visible
    <>
      <div className="flex flex-col items-center justify-center gap-8">
        <Spacer y={28} />
        <h2 className="text-center text-4xl font-bold text-custom-red">
          Ups! Looks like something went wrong. Please try again later.
        </h2>
        <Alert description={error.message} color="danger" />
        <ButtonDos
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
        >
          Try again
        </ButtonDos>
      </div>
    </>
  );
}
