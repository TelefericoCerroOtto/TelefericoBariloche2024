import { TriangleAlert } from "lucide-react";
import { type ReactNode } from "react";

interface Props {
  message?: ReactNode;
}

export default function FormError(props: Props) {
  const { message } = props;
  if (message)
    return (
      <div className="flex items-center gap-x-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
        <TriangleAlert className="h-4 w-4" />
        {typeof message === "string" ? <p>{message}</p> : message}
      </div>
    );
  return null;
}
