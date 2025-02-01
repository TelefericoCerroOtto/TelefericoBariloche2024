export async function fetcher(...args: Parameters<typeof fetch>) {
  const res = await fetch(...args);
  if (res.status === 200 || res.status === 201) return await res.json();
  const data = await res.json();
  throw new Error(JSON.stringify(data));
}
