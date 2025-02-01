import type { StrapiError } from "@/types";

export default function ErrorPage({ error }: { error: StrapiError }) {
  const { status, name, message } = error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
        <h1 className="text-6xl font-bold text-red-500">{status}</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-800">{name}</h2>
        <p className="mt-2 text-gray-600">{message}</p>
        <div className="mt-6">
          <a
            href="/"
            className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
