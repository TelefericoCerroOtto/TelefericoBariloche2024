interface Props {
  desc: string;
  children: React.ReactNode;
}

export default function FormContainer(props: Props) {
  const { desc, children } = props;

  return (
    <div className="mx-auto min-h-full w-[600px] border-x border-x-[#DEDFE2] bg-white px-4 py-9">
      <div className="mb-4 flex flex-col gap-3">
        <h2 className="text-3xl">Completa Los Datos Del Formulario</h2>
        <p className="font-light">{desc ?? "hola mundo"}</p>
      </div>
      {children}
    </div>
  );
}
