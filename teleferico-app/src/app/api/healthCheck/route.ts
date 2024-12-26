import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("jwt");

  console.log("token", token);
  return new Response(JSON.stringify({ ok: true, message: "helath check" }), {
    status: 200,
  });
}
