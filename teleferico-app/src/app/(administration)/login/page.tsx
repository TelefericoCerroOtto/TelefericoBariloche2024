import { FormDos } from "./_components/FormDos";
import Portrait from "./_components/Portrait";

export default function Page() {
  return (
    <div className="flex h-screen w-full items-center justify-between">
      <Portrait />
      <FormDos />
    </div>
  );
}
