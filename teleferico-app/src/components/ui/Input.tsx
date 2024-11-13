"use client";

import { cva } from "class-variance-authority";
import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  touched?: boolean;
}

const inputStyles = cva("rounded-md border p-2", {
  variants: {
    intent: {
      primary: "border-black",
      error: "border-red-600",
    },
  },
  defaultVariants: {
    intent: "primary",
  },
});

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
