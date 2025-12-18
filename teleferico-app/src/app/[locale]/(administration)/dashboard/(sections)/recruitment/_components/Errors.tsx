export function NoReachError() {
  return (
    <section className="flex w-full flex-col gap-3 p-6">
      <h1 className="text-2xl font-semibold text-foreground">
        Gestión de postulaciones
      </h1>
      <p className="text-sm text-danger-500">
        No se pudieron cargar los sectores desde el CMS. Probá recargar la
        página o verificá que Strapi esté en línea.
      </p>
    </section>
  );
}

export function NoContentError() {
  return (
    <section className="flex w-full flex-col gap-3 p-6">
      <h1 className="text-2xl font-semibold text-foreground">
        Gestión de postulaciones
      </h1>
      <p className="text-sm text-warning-500">
        No hay sectores configurados en el CMS. Creá al menos un sector en
        Strapi para poder filtrar las postulaciones por sector.
      </p>
    </section>
  );
}
