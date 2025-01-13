import { TitleDescBlock, HoursOverviewItems } from "@/components";

export default function HoursOverview() {
  return (
    <section className="mb-14">
      <TitleDescBlock
        title="Horarios de Operación"
        desc={
          <>
            Tené en cuenta que todos los horarios están sujetos a cambios debido
            a condiciones climáticas o imprevistos. Encontranos en{" "}
            <span className="font-bold">
              Av. De los Pioneros KM 5.000, San Carlos De Bariloche.
            </span>
          </>
        }
      />
      <HoursOverviewItems />
    </section>
  );
}
