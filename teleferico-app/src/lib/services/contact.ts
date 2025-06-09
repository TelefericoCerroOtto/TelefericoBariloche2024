import { ContactFormData } from "@/types";
import { ROUTE_HANDLERS } from "@/utils/routes.const";

export const sendEmail = async (values: ContactFormData) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}${ROUTE_HANDLERS.CONTACT}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    },
  );

  let success = false;

  if (res.status === 200) {
    success = true;
  }

  const data = (await res.json()) as { message: string };

  return {
    success,
    message: data.message,
  };
};
