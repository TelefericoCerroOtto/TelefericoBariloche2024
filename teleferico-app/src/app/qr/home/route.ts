export function GET(_request: Request) {
  return new Response(null, {
    status: 302,
    headers: { Location: "/" },
  });
}
