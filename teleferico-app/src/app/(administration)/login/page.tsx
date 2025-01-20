import { Form } from "./_components/Form";
import Portrait from "./_components/Portrait";

export default function Page() {
  return (
    <div className="flex h-screen w-full items-center justify-between">
      <Portrait />
      <Form />
    </div>
  );
}
