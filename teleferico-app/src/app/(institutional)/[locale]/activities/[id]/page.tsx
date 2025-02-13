export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  console.log("id", id);

  return <div>Activity {id}</div>;
}
