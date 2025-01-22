import { TriangleAlert } from "lucide-react";

interface Props {
  message?: string;
}

export default function FormError(props: Props) {
  const { message } = props;
  if (message)
    return (
      <div className="flex items-center gap-x-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
        <TriangleAlert className="h-4 w-4" />
        <p>{message}</p>
      </div>
    );
  return null;
}
