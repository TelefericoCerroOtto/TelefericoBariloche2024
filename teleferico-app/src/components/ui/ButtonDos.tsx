"use client";

import { type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function ButtonDos(props: Props) {
  const { children, ...buttonProps } = props;

  return (
    <button
      type="submit"
      className="h-[45px] w-full rounded-md bg-[#bf2c37] p-2 text-white hover:bg-[#bf2c37]/90"
      {...buttonProps}
    >
      {children}
    </button>
  );
}
