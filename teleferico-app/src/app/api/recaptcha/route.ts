export async function POST(req: Request) {
  const data = await req.json();
  const { token } = data;
  const secretKey = process.env.RECAPTCHA_SECRET_KEY ?? "";

  if (!token) {
    return new Response(JSON.stringify({ message: "Token not found" }), {
      status: 405,
    });
  }

  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
    );

    console.log("recaptcha response: ", response);

    // if (response.data.success) {
    //   return new Response(JSON.stringify({ message: "Success" }), {
    //     status: 200,
    //   });
    // } else {
    //   return new Response(JSON.stringify({ message: "Failed to verify" }), {
    //     status: 405,
    //   });
    // }
  } catch (error) {
    console.log("recaptcha post method error", error);

    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
    });
  }
}
