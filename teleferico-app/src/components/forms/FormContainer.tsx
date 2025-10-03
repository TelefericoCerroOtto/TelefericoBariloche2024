type Size = "sm" | "md" | "lg" | "full";

interface Props {
  desc: string;
  size?: Size;
  children: React.ReactNode;
}

export default function FormContainer(props: Props) {
  const { desc, size = "md", children } = props;

  const sizeVariants: Record<Size, string> = {
    sm: "md:w-[600px]",
    md: "md:w-[850px]",
    lg: "md:w-[1200px]",
    full: "w-full",
  };

  return (
    <div
      className={`mx-auto min-h-full border-x border-x-[#DEDFE2] bg-white px-4 py-9 ${sizeVariants[size]}`}
    >
      <div className="mb-8 flex flex-col gap-3 md:mb-4">
        <h2 className="text-3xl">Completa Los Datos Del Formulario</h2>
        <p className="font-light">
          {desc ?? "Este formulario no tiene una descripcion"}
        </p>
      </div>
      {children}
    </div>
  );
}
