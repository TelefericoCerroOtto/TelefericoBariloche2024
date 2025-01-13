import { HoursOverviewItems, TitleDescBlock } from "@/components";

export default function InfoSection() {
  return (
    <section className="mb-14">
      <TitleDescBlock
        title="Tu día perfecto en el cerro otto"
        desc={
          <>
            Recordá que{" "}
            <span className="font-bold">
              los horarios están sujetos a cambios por condiciones climáticas,
            </span>{" "}
            así que planificá con flexibilidad y asegurate de tener un día
            increíble. Encontranos en{" "}
            <span className="font-bold">
              Av. De los Pioneros KM 5.000, San Carlos De Bariloche
            </span>
          </>
        }
      />
      <HoursOverviewItems />
    </section>
  );
}
