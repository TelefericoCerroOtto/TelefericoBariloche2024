import { CableCar, CircleDollarSign, Wind } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Section } from "@/components";

export default function State() {
  return (
    <Section className="justify-center">
      <div>
        <Card>
          <CardHeader className="items-center">
            <CardTitle>Estado del servicio</CardTitle>
            <CardDescription>
              Consulta precio, disponibilidad y clima
            </CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="flex items-baseline justify-between space-y-2">
            <div className="flex flex-1 flex-col items-center">
              <CircleDollarSign width={40} height={40} />
              <p className="text-center">$25000</p>
            </div>
            <div className="flex flex-1 flex-col items-center">
              <CableCar width={40} height={40} color="#57e389" />
              <p className="text-center">Servicio Normal</p>
            </div>
            <div className="flex flex-1 flex-col items-center">
              <Wind width={40} height={40} />
              <p className="text-center">Levemente ventoso</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
