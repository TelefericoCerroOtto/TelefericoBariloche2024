"use client";

import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

const inputStyles = cva(
  "rounded-full border border-custom-border px-5 py-2 outline-none",
  {
    variants: {
      intent: {
        primary: "border-accent bg-accent",
        error: "border-custom-red",
      },
    },
    defaultVariants: {
      intent: "primary",
    },
  },
);

interface Props
  extends InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputStyles> {
  label: string;
  error?: string;
  touched?: boolean;
}

export default function Input(props: Props) {
  const {
    label,
    id,
    error,
    touched = false,
    onChange,
    onBlur,
    ...inputProps
  } = props;

  return (
    <div className="grid gap-2">
      <div className="flex items-center">
        <label
          htmlFor={id}
          className={clsx(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            { "text-red-600": error && touched },
          )}
        >
          {label}
        </label>
        {error && touched ? (
          <p className="ml-auto inline-block text-sm text-red-600">{error}</p>
        ) : null}
      </div>
      <input
        id={id}
        className={
          error && touched
            ? inputStyles({ intent: "error" })
            : inputStyles({ intent: "primary" })
        }
        onChange={onChange}
        onBlur={onBlur}
        {...inputProps}
      />
    </div>
  );
}
