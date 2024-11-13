import { LoginForm } from "@/components";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import HealthCheck from "./HealthCheck";

export function Form() {
  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Inciar sesión</CardTitle>
        <CardDescription>
          Ingrese su email y contraseña para acceder
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <HealthCheck />
      </CardContent>
    </Card>
  );
}
