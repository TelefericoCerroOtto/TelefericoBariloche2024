# Teleférico Bariloche 2024 — CMS (Strapi)

Backend (CMS) del proyecto, implementado con **Strapi**.
Para la documentación completa sobre **CI/CD** y **despliegue en GCP** (App Engine, Cloud SQL, Cloud Storage), consultar el README principal del repositorio:

- `../README.md`

---

## Scripts útiles

- `npm run develop`: inicia Strapi en modo desarrollo (con _auto-reload_)
- `npm run start`: inicia Strapi en modo producción (sin _auto-reload_)
- `npm run build`: compila el panel de administración

---

## Variables de entorno (principales)

- `DATABASE_CLIENT` (`sqlite` | `mysql` | `postgres`)
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`
- `GCS_BUCKET_NAME`, `GCS_BASE_PATH` (provider de Google Cloud Storage)
- `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`

El provider de subida a **Google Cloud Storage** está configurado mediante:

```
@strapi-community/strapi-provider-upload-google-cloud-storage
```

---

## Desarrollo local (rápido)

1. Instalar dependencias y definir el archivo `.env` en `./teleferico-cms/` con la configuración de la base de datos:

   - **Opción simple:** usar SQLite (`DATABASE_CLIENT=sqlite`)
   - **Opción alternativa:** configurar MySQL o PostgreSQL utilizando las variables indicadas arriba

2. Ejecutar:

```bash
npm run develop
```

Strapi se inicia, por defecto, en `http://localhost:1337`.

---

## Deploy

El despliegue se realiza en **Cloud Run** ya que, a diferencia de **App Engine Standard** (utilizado anteriormente), **soporta Web Sockets**.
Los Web Sockets son necesarios para ejecutar el comando `transfer`, encargado de migrar datos desde la base de datos local hacia la remota.

El proceso de despliegue se realiza mediante **Cloud Build**, utilizando un _trigger_ definido en `cloudbuild.yaml`, que escucha cambios en la rama correspondiente al entorno de despliegue (`staging` o `production`).

---

## Migración de datos

Los datos definidos en la base de datos local se transfieren al entorno remoto (**Cloud Storage** y **Cloud SQL**) mediante el comando `transfer` de Strapi.

Las transferencias solo pueden realizarse en los siguientes sentidos:

- **Local → Remoto**
- **Remoto → Local**

❌ No está permitido **Remoto → Remoto**.

### Requisitos para la transferencia

Se necesitan dos datos:

1. **URL del panel de administración remoto**
   Ejemplo: `https://my-strapi-instance/admin`

2. **Transfer Token**, creado en la instancia que actúa como origen o destino.
   Existen tres tipos:

   - **pull:** para traer datos
   - **push:** para enviar datos
   - **full-access:** para ambas operaciones

En este caso, se debe crear un **Transfer Token de tipo `push`** en la instancia **remota**.

---

### Consideraciones previas

Antes de iniciar la transferencia, asegurarse de que el servidor de Strapi **local** esté corriendo.
Dado que la transferencia utiliza **Web Sockets**, el servidor no debe ejecutarse con _watcher_ activo (_fast refresh_).

La forma más simple es iniciar Strapi localmente en modo producción:

```bash
npm run build
npm run start
```

---

### Timeout de Cloud Run

Dependiendo del volumen de datos, la transferencia puede demorar varios minutos.
Por este motivo, es **obligatorio** configurar el timeout de Cloud Run en **3600 segundos (1 hora)** para evitar cortes inesperados que puedan corromper los datos y dejar la transferencia en un estado inconsistente.

Este ajuste se realiza **una sola vez** desde **Cloud Shell**:

```bash
gcloud run services update <CLOUD_RUN_SERVICE_NAME> \
  --region southamerica-east1 \
  --timeout=3600
```

Si la transferencia se interrumpe, será necesario eliminar manualmente los datos generados y reiniciar el proceso completo.

---

### Ejecución del comando de transferencia

Con el servidor local ya en ejecución, abrir una nueva terminal en el directorio base del proyecto `teleferico-cms` y ejecutar:

```bash
npm run strapi transfer -- --to <STRAPI_TRANSFER_URL> --to-token <STRAPI_TRANSFER_TOKEN>
```

Para simplificar el proceso, se recomienda definir las variables de entorno:

- `STRAPI_TRANSFER_URL`
- `STRAPI_TRANSFER_TOKEN`

---

⚠️ **IMPORTANTE**
Mientras la transferencia esté en curso, **no realizar ninguna operación de lectura o escritura en ninguna de las dos instancias** (local ni remota).
Dejar que el proceso finalice completamente para evitar inconsistencias o errores en los datos.

---
