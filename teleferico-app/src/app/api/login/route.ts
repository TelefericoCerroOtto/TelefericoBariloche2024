import { login } from "@/lib/services/login";
import { SuccessfulLoginResponse } from "@/types/api";
// import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const values = await request.json();
    const loginRes = await login(values);

    if (loginRes.ok) {
      return new Response(JSON.stringify({ ok: true, loginRes }), {
        status: 200,
        headers: { "Set-Cookie": `jwt=${loginRes.data.jwt};SameSite=Strict` },
      });
    }
    return new Response(
      JSON.stringify({ ok: false, message: "Credenciales invalidas" }),
      { status: 401 },
    );
  } catch (error) {
    console.log("login POST route handle error", error);
    return new Response(
      JSON.stringify({
        message: "login route handler error, check server console",
      }),
      { status: 500 },
    );
  }
}
