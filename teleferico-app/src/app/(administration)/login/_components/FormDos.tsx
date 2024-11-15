import { Divider } from "@nextui-org/divider";
import LoginForm from "./LoginForm";
import FormHeader from "./FormHeader";

export function FormDos() {
  return (
    <div className="m-4 flex w-1/4 flex-col gap-8">
      <FormHeader />
      <Divider />
      <LoginForm />
    </div>
  );
}
