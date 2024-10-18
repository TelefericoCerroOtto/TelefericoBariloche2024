import { Divider } from "@nextui-org/react";
import { ROUTES } from "@/utils/routes.const";
import Link from "next/link";

export default function Footer() {
  const { RULES, CONTACT } = ROUTES;
  const items = [
    { title: "Terminos y condiciones", route: RULES },
    { title: "Contacto", route: CONTACT },
  ];

  return (
    <footer className="mt-6 flex h-28 items-center bg-slate-500">
      <ul className="ml-8 flex h-6 items-center space-x-6 text-small text-white">
        {items.map((item, index) => (
          <li key={index}>
            <Link href={item.route}>
              <div>{item.title}</div>
            </Link>
            <Divider orientation="vertical" className="bg-white" />
          </li>
        ))}
      </ul>
    </footer>
  );
}
