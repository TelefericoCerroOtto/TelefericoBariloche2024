"use client";

import { ChangeEvent } from "react";

interface Props {
  value: string;
  // eslint-disable-next-line no-unused-vars
  onChange: (value: ChangeEvent<HTMLInputElement>) => void;
}

export default function Honeypot(props: Props) {
  const { value, onChange } = props;

  // Honeypot field discourages bots while staying invisible to real users.
  return (
    <div className="absolute left-[-9999px]" aria-hidden="true">
      <label htmlFor="company" aria-hidden="true">
        Do not fill out
      </label>
      <input
        id="company"
        name="company"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
