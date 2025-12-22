# Teleférico Bariloche 2024

Este repositorio alberga la nueva versión del sitio web de Teleférico Cerro Otto, diseñado para ofrecer una experiencia mejorada y moderna. Desarrollado con [Next.js](https://nextjs.org/) y [Strapi](https://strapi.io/), el proyecto está desplegado en Google [Cloud Platform](https://cloud.google.com/?hl=es-419), garantizando rendimiento y escalabilidad. Esta nueva implementación sustituirá la versión anterior una vez que esté completamente finalizada.

## Tabla de contenidos

- Estructura del monorepo
- Configurar entorno local
  - STRAPI (CMS)
  - Next.js (Web)
- Pasos para el despliegue (resumen)
- CI/CD (resumen)
- Flujo de trabajo con Git

## Estructura del monorepo 📁

- `teleferico-app`: Aplicación web (Next.js). Consume la API de Strapi y se despliega en Cloud Run.
- `teleferico-cms`: CMS (Strapi). Usa Cloud SQL + Cloud Storage y se despliega en App Engine.

# Configurar entorno local 🔧

## STRAPI

### Prerequisitos ✅

Strapi utiliza Nodejs y alguna base de datos SQL (MySQL, PostgreSQL o SQLite). Por ello es necesario tener ambas instaladas.

En este caso el entorno local contaba con [nvm](https://github.com/nvm-sh/nvm) para gestionar las versiones de NodeJS, en particular se utilizo la v20.17.0.

Para la base de datos se utilizo MySQL v8.0.37 gestionado a traves de MySQL Workbench. Es necesario tener el servidor de la base de datos corriendo en algun puerto y dentro generar la base de datos que utilizara Strapi. Todos estos parametros se configuran a traves de la consola cuando se selecciona la configuracion manual al ejecutar el comando `npx create-strapi-app`. Si se usa la opcion `quickstart` seran colocados valores por defecto. Tambien se pueden modificar a traves de las variables de entorno en el archivo **.env** una vez creado el proyecto. Las variables son

- DATABASE_CLIENT: Base de datos que se utilizara
- DATABASE_HOST: Direccion IP del servidor
- DATABASE_PORT: Puerto donde corre el servidor
- DATABASE_NAME: Nombre de la base de datos
- DATABASE_USERNAME: Usuario con permisos necesarios para operar con la DB.
- DATABASE_PASSWORD: Contraseña del usuario.

### Inicializar proyecto 📦

Para la creacion del proyecto se siguieron los siguientes pasos.

Ubicarse en el directorio donde se desee crear el proyecto, y ejecutar el comando `npx create-strapi-app@latest nombre_del_proyecto` reemplazando _"nombre_del_proyecto"_ por el nombre real de tu proyecto. Este comando creara una carpeta nombrada como se le indico anteriormente con toda la aplicacion dentro.

> **Nota:** Puede lanzar un error al ejecutar el comando `npm run develop` que diga `throw new Error('Failed to load native binding', { cause: loadErrors })`. No se porque sucede esto, pero para solucionarlo simplemente ejecutar el comando `npm update` dentro del directorio del proyecto.

> **Nota:** Cuando se utiliza una version de MySQL mayor a la 8._ es necesario instalar el paquete **mysql2** a traves del comando `npm i mysql2`. Si la version de strapi es 4._, hay que configurar el cliente como _mysql2_. Esto se logra cambiando el valor de la variable de entorno _DATABASE_CLIENT_ por _mysql2_ definida dentro del archivo **.env**. De lo contrario se obtendra un error al momento de lanzar el servidor de desarrollo que dira:
> `ER_NOT_SUPPORTED_AUTH_MODE: Client does not support authentication protocol requested by server;`

### Instalación

Clonar el repositorio:

```bash
git clone <REPO_URL>
cd TelefericoBariloche2024
```

### Iniciar app

Ubicarse con la terminal dentro del directorio "./teleferico-cms" y ejecutar el comando `npm run develop`. Deberia desplegarse una salida por consola donde se encuentre la direccion ip y el puerto donde se esta corriendo Strapi.

## Next.js (Web)

### Requisitos

- Node.js 20.x (recomendado 20.17.0)

### Variables de entorno usadas por la app

- `BUILD_STRAPI_BASE_URL`: Base URL del CMS para imágenes y rewrites (build-time)
- `BUILD_STRAPI_BUCKET_HOSTNAME`: Host del bucket de imágenes (build-time)
- `BUILD_STRAPI_BUCKET_PATHNAME`: Path del bucket, ej. `/uploads/*` (build-time)
- `NEXT_PUBLIC_BASE_URL`: Base URL pública del sitio, usada en middleware (runtime)
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`: Clave de reCAPTCHA (runtime)

### Iniciar app

1. Crear un archivo `.env.local` en `./teleferico-app/` con las variables necesarias. Para desarrollo local típico:

   ```env
   BUILD_STRAPI_BASE_URL=http://localhost:1337
   BUILD_STRAPI_BUCKET_HOSTNAME=localhost
   BUILD_STRAPI_BUCKET_PATHNAME=/uploads/*
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
   ```

2. Ejecutar desde `./teleferico-app`:

   ```bash
   npm run dev
   ```

La configuración de imágenes remotas y rewrites está en `teleferico-app/next.config.mjs`.

# Pasos para el despliegue 🚀

## STRAPI

### Configuracion ⚙️

**PostgreSQL**

Dado que la base de datos elegida para desplegar en GCP sera PostgreSQL, es necesario instalar un cliente de pg para Nodejs. Para ello nos colocamos el directorio del proyecto y ejecutamos `npm i pg`.

Se creara una sola configuracion extra para el entorno de produccion y desarrollo y sera tanto para _"/config/env/production/database.ts"_ como para _"/config/env/staging/database.ts"_

**TS**

```typescript
export default ({ env }) => ({
  connection: {
    host: `/cloudsql/${env("INSTANCE_CONNECTION_NAME")}`,
  },
});
```

**JS**

```javascript
module.exports = ({ env }) => ({
  connection: {
    host: `/cloudsql/${env("INSTANCE_CONNECTION_NAME")}`,
  },
});
```

---

**Cloud Storage**

Para que Strapi funcione correctamente con los buckets de Cloud Storage es necesario instalar un paquete. Ejecutar `npm i @strapi-community/strapi-provider-upload-google-cloud-storage` dentro del directorio del proyecto y a continuación definir el siguiente contenido para los archivos de configuración _"/config/env/production/plugins.ts"_ y _"/config/env/staging/plugins.ts"_

**TS**

```typescript
export default ({ env }) => ({
  upload: {
    config: {
      provider: "@strapi-community/strapi-provider-upload-google-cloud-storage",
      providerOptions: {
        bucketName: env("GCS_BUCKET_NAME"),
        basePath: env("GCS_BASE_PATH"),
        publicFiles: true,
        uniform: false,
      },
    },
  },
});
```

**JS**

```javascript
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: "@strapi-community/strapi-provider-upload-google-cloud-storage",
      providerOptions: {
        bucketName: env("GCS_BUCKET_NAME"),
        basePath: env("GCS_BASE_PATH"),
        publicFiles: true,
        uniform: false,
      },
    },
  },
});
```

---

**Definir entornos**

Strapi permite definir configuraciones estaticas dependiendo del entorno en el que se este ejecutando. El entorno se define a traves de la variable de entorno _NODE_ENV_ (su valor por defecto es "development"). Para definir estas configuraciones es necesario declarar una carpeta llamada "env" dentro del directo "/config", y dentro de la cual crearemos tantas carpetas como entornos se precisen. Las configuraciones definidas dentro de estas carpetas sobreescribiran a las que se encuentren dentro de "/config". Por ejemplo, todas las opciones declaradas en el archivo _"/config/env/production/database.ts"_ sobreescribiran a las del archivo _"/config/database.ts"_ cuando la variable de entorno _NODE_ENV=production_. Para mas info ver [environment configurations](https://docs-v4.strapi.io/dev-docs/configurations/environment#environment-configurations).

> **Nota:** Para que la sobreescritura de configuracion funcione, es necesario que la carpeta tenga exactamente el mismo nombre que el valor de la variable _NODE_ENV_.

> **Nota:** Strapi captura automáticamente el valor de la variable de entorno _NODE_ENV_ al ejecutar los comandos "build" y "start". Este valor se define en el archivo app.yaml, lo que permite que Strapi utilice el entorno deseado por el desarrollador tanto durante la construcción(Cloud Build) como al iniciar la aplicación(App Engine).

---

### Google Cloud API's 🔗

Es necesario habilitar todas las APIs que seran utilizadas en GCP(Google Cloud Platform) para que Strapi funcione correctamente.

- **IAM:** Aqui se controlan los accesos y permisos de las cuentas y [cuentas de servicios](https://cloud.google.com/iam/docs/service-account-overview?hl=es-419#service-accounts-identities)
- **App Engine:** Entorno completamente gestionado que permite crear y ejecutar aplicaciones sin preocuparse por la infraestructura subyacente.
- **App Engine Admin:** Conjunto de interfaces y métodos que permiten interactuar con las aplicaciones de App Engine de forma programática.
- **Cloud Storage:** Sirve para guardar los archivos como fotos, videos y PDF. Se habilitará automáticamente una vez que se inicialice la aplicación en App Engine.
- **Cloud Build:** Permite el CI/CD del proyecto una vez se registren cambios en el repositorio.
- **Cloud SQL Admin:**
- **Compute Engine:** Es necesario para poder usar Cloud SQL.
- **Secret Manager:** Aqui se guardaran todas las variables de entorno y demas informacion sensible.
- **Cloud Logging:** Sirve para visualizar los logs del build que se hace en Cloud Build.

Se pueden habilitar a traves de Cloud Shell con los siguientes comandos

```bash
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable appengine.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable run.googleapis.com
```

---

### Inicializar servicios ✨

Luego de habilitar los servicios es necesario inicializar algunos de ellos

- App Engine
- Cloud SQL
- Cloud Storage

---

#### App Engine

**Creacion**
Se puede crear a traves de la interfaz de GCP o bien con el comando
`gcloud app create --region=us-central` en la Cloud Shell.

Este proceso de creacion creara tambien una cuenta de servicio por defecto correspondiente a App Engine (app_engine_id@appspot.gserviceaccount.com). Se usara esta cuenta para realizar las solicitudes a los demas servicios, si bien se puede crear una nueva cuenta de servicio controlando mas granularmente los permisos que posea.

**Permisos**
Sera necesario otorgarle permisos para que pueda utilizar los distintos servicios, esto se logra a traves de la asignacion de roles.

Se pueden definir por consola (Cloud Shell)

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
--member=serviceAccount:SERVICE_ACCOUNT \
--role=ROLE
```

o bien editando la cuenta de servicio desde [IAM & Admin](https://cloud.google.com/iam/docs/?hl=es-419).

Los roles necesarios para la Service Account que utilizara App Engine son:

- roles/cloudsql.client
- roles/cloudsql.editor
- roles/storage.objectAdmin
- roles/appengine.deployer
- roles/logging.admin

Tambien es necesario crear el archivo _"app.yaml"_ dentro del root del proyecto. Alli se definiran las distintas configuraciones del servicio a desplegar. Mas info [aca](https://cloud.google.com/appengine/docs/standard/reference/app-yaml?tab=node.js). Este archivo sera ejecutado con el comando `gcloud` de la [gcloud CLI](https://cloud.google.com/sdk/docs/install) para el despliegue de la misma en App Engine.

El archivo definido tiene la siguiente forma

```yaml
runtime: nodejs20
instance_class: %INSTANCE_CLASS%

env_variables:
  NODE_ENV: %NODE_ENV%
  HOST: %HOST%
  DATABASE_CLIENT: %DATABASE_CLIENT%
  DATABASE_NAME: %DATABASE_NAME%
  DATABASE_USERNAME: %DATABASE_USERNAME%
  DATABASE_PASSWORD: %DATABASE_PASSWORD%
  INSTANCE_CONNECTION_NAME: %INSTANCE_CONNECTION_NAME%
  GCS_BUCKET_NAME: %GCS_BUCKET_NAME%
  GCS_BASE_PATH: %GCS_BASE_PATH%
  APP_KEYS: %APP_KEYS%
  API_TOKEN_SALT: %API_TOKEN_SALT%
  ADMIN_JWT_SECRET: %ADMIN_JWT_SECRET%
  TRANSFER_TOKEN_SALT: %TRANSFER_TOKEN_SALT%
  JWT_SECRET: %JWT_SECRET%

build_env_variables:
  NODE_ENV: %NODE_ENV%

beta_settings:
  cloud_sql_instances: %INSTANCE_CONNECTION_NAME%
```

Los valores de las variables de entorno se encuentran entre "%%" para ser delimitados y reemplazados durante el proceso de building. Se explica mas adelante en la seccion de CI/CD.

Las variables de entorno declaradas en la opcion **env** estaran disponibles en tiempo de ejecucion.
Mientras que las de **build_env_variables** en tiempo de construccion, es decir cuando se inicie el subproceso de `gcloud app deploy` dentro del trigger en Cloud Build. _"NODE_ENV"_ es declarado en ambas porque es necesario que strapi tenga acceso a esta variable para poder tomar la configuracion correspondiente dependiendo del entorno, tanto para el comando `"gcp-build"` como para `"start"`.

**Ignorar archivos App Engine**

Se define el archivo _".gcloudignore"_ para especificar los directorios que no seran subidos a App Engine durante el despliegue. Los archivos que no sean necesario iran alli. Por ejemplo la carpeta _"node_modules"_, ya que sera creada automaticamente cuando se ejecute el comando de `build` definido en el _"package.json"_. El archivo tiene la siguiente forma

```
.gcloudignore
.git
.gitignore
node_modules/
#!include:.gitignore
!.env
../design/*
../frontend/*
```

**Desplegando por primera vez: ERROR: (gcloud.app.deploy) Error Response: [13]**

Se puede ver el error mencionado cuando se desplega una aplicacion por primera vez en un proyecto. Esto se debe a politicas implementadas sobre como [Cloud Build utiliza las cuentas de servicio desde Junio de 2024](https://cloud.google.com/appengine/docs/flexible/troubleshooting#default-sa-permissions). Los cambios estan detallados [aqui](https://cloud.google.com/build/docs/cloud-build-service-account-updates). Para solucionar este problema, es necesario otorgar el rol de Editor del proyecto a la cuenta de servicio que utiliza Cloud Build para deployar en App Engine. Mas links de interes:

- [Protege App Engine](https://cloud.google.com/iam/docs/service-accounts-actas?hl=es-419#cloud-composer)
- [Identidad temporal](https://cloud.google.com/iam/docs/service-account-impersonation?hl=es-419)

---

#### Cloud SQL

Aqui es recomendable crearlo desde la interfaz de GCP ya que la distintas opciones van a influir en el rendimiento y costo del servicio. Este resumen sera mostrado antes de crear la base de datos.

Por defecto solo cuenta con un super admin que es el usuario postgres y del cual podemos generar una clave automaticamente durante la etapa de inicilizacion. Es recomendable por razones de seguridad crear un nuevo usuario gestionando unicamente los permisos necesarios para que utilice App Engine/Strapi.

> **Nota:** Dado que el servicio es bastante caro, es recomendable detener las bases de datos que no sean de produccion mientras no se esten utilizando.

---

#### Cloud Storage

Cuando se inicializa el servicio de App Engine se crean automaticamente 2 buckets dentro de Storage. Estos llevaran el nombre de _**staging.app_engine_id.appspot.com**_ y _**app_engine_id.appspot.com**_. No es recomendable tocarlos ni configurarlos.

Para este proyecto se crea un nuevo bucket. Tambien es recomendable hacerlo desde la interfaz de GCP ya que de alli se pueden visualizar las distintas configuraciones.

### CI/CD 🔄

---

#### Conectar Repositorio

Para implementarlo se debe utilizar [Cloud Build](https://cloud.google.com/build/docs). Lo primero es configurar una _HOST CONNECTION_ con el proveedor de tu repositorios, en este caso Github. Esto se realiza en la opcion _"Create Host Connection"_ de la pestaña _"Repositories"_. Se realizara una redireccion en una ventana emergente que solicitara acceso a la cuenta de github. Desde este punto se puede dar acceso a uno o varios repositorios que se encuentren dentro de la cuenta. Lo mas recomendable es solo dar acceso a aquel que sea necesario.

> **Nota:** Se debe realizar este proceso con la opcion de **2da GEN** para los repositorios.

Lo siguiente es vincular el repositorio desde la opcion _"Link Repository"_. Aqui solo hace falta seleccionar una conexion y un repositorio disponible en esa conexion.

---

#### Variables de entorno y Trigger

Las variables de entorno en App Engine se definen dentro del archivo app.yaml, ademas de otras configuraciones. El problema con declararlas alli, es que el archivo tiene que subirse al repositorio, por ende quedarian expuestas. Para solucionar esto, se colocaran los valores de las variables durante el proceso de building en Cloud Build mediante el reemplazo con el comando `sed`. Ademas, los valores a reemplazar estaran guardados en [Secret Manager](https://cloud.google.com/secret-manager/docs?hl=es-419). Los secretos estaran con las etiquetas `production` o `staging` segun correspondan.
Para que Cloud Build pueda acceder a los valores en Secret Manager y poder realizar el despliegue en App Engine es necesario darle permisos a la cuenta de servicio que utilizara. El proceso de building se realiza a traves de los Triggers (Activadores). Las cuentas de servicio se aplican a nivel de trigger. Los roles que se aplicaran a la cuenta de servicio que utilice el Trigger para el despliegue seran

- **roles/appengine.deployer**: Para poder desplegar la aplicacion
- **roles/iam.serviceAccountUser**: Explicacion de porque hace falta este rol [aca](https://stackoverflow.com/questions/64236468/cloud-build-fails-to-deploy-to-google-app-engine-you-do-not-have-permission-to)
- **roles/secretmanager.secretAccessor**: Acceder a los secretos y asignarlos a las varaibles de entorno

Por fines practicos se utilizara una misma cuenta de servicio para Cloud Build y App Engine. Aunque actualmente esto supone potenciales riesgos de seguridad, en un futuro es probable que se modifique y se explique como trabajan las cuentas de servicio entre si.

Los triggers necesitan el archivo "buildconfig.yaml" para saber que pasos ejecutar. Cada paso definido se ejecuta en un contenedor de Docker aislado. Este archivo se puede definir dentro del repositorio o a traves de la interfaz de gcp dentro de la configuracion del trigger. Se utiliza la ultima opcion. A continuacion la estructura del archivo y luego una breve explicacion

```yaml
steps:
  - name: gcr.io/google.com/cloudsdktool/cloud-sdk
    args:
      - "-c"
      - >
        gcloud config set app/cloud_build_timeout 1600 &&

        sed -i 's/%INSTANCE_CLASS%/${_INSTANCE_CLASS}/g' ./path/to/app.yaml &&

        sed -i 's/%HOST%/${_HOST}/g' ./path/to/app.yaml &&

        sed -i 's/%NODE_ENV%/${_NODE_ENV}/g' ./path/to/app.yaml &&

        sed -i 's/%DATABASE_CLIENT%/${_DATABASE_CLIENT}/g' ./path/to/app.yaml &&

        sed -i "s/%DATABASE_NAME%/$$DATABASE_NAME_STAGING/g" ./path/to/app.yaml &&

        sed -i "s/%DATABASE_USERNAME%/$$DATABASE_USERNAME_STAGING/g" ./path/to/app.yaml &&

        sed -i "s/%DATABASE_PASSWORD%/$$DATABASE_PASSWORD_STAGING/g" ./path/to/app.yaml &&

        sed -i "s/%INSTANCE_CONNECTION_NAME%/$$INSTANCE_CONNECTION_NAME_STAGING/g" ./path/to/app.yaml &&

        sed -i 's/%GCS_BUCKET_NAME%/${_GCS_BUCKET_NAME}/g' ./path/to/app.yaml &&

        sed -i 's/%GCS_BASE_PATH%/${_GCS_BASE_PATH}/g' ./path/to/app.yaml &&

        sed -i "s/%APP_KEYS%/$$APP_KEYS_STAGING/g" ./path/to/app.yaml &&

        sed -i "s/%API_TOKEN_SALT%/$$API_TOKEN_SALT_STAGING/g" ./path/to/app.yaml &&    

        sed -i "s/%ADMIN_JWT_SECRET%/$$ADMIN_JWT_SECRET_STAGING/g" ./path/to/app.yaml &&

        sed -i "s/%TRANSFER_TOKEN_SALT%/$$TRANSFER_TOKEN_SALT_STAGING/g" ./path/to/app.yaml &&

        sed -i "s/%JWT_SECRET%/$$JWT_SECRET_STAGING/g" ./path/to/app.yaml &&

        gcloud app deploy ./path/to/app.yaml --project
        teleferico-bariloche-2024
    entrypoint: bash
    secretEnv:
      - DATABASE_NAME_STAGING
      - DATABASE_USERNAME_STAGING
      - DATABASE_PASSWORD_STAGING
      - INSTANCE_CONNECTION_NAME_STAGING
      - APP_KEYS_STAGING
      - API_TOKEN_SALT_STAGING
      - ADMIN_JWT_SECRET_STAGING
      - TRANSFER_TOKEN_SALT_STAGING
      - JWT_SECRET_STAGING
timeout: 1600s
options:
  logging: CLOUD_LOGGING_ONLY
substitutions:
  _HOST: 0.0.0.0
  _GCS_BUCKET_NAME: strapi-bucket-teleferico-2024-staging
  _DATABASE_CLIENT: postgres
  _GCS_BASE_PATH: cms
  _NODE_ENV: staging
  _INSTANCE_CLASS: F2
availableSecrets:
  secretManager:
    - versionName: projects/<PROJECT_ID>/secrets/DATABASE_NAME_STAGING/versions/<SECRET_VERSION>
      env: DATABASE_NAME_STAGING
    - versionName: projects/<PROJECT_ID>/secrets/DATABASE_USERNAME_STAGING/versions/<SECRET_VERSION>
      env: DATABASE_USERNAME_STAGING
    - versionName: projects/<PROJECT_ID>/secrets/DATABASE_PASSWORD_STAGING/versions/<SECRET_VERSION>
      env: DATABASE_PASSWORD_STAGING
    - versionName: projects/<PROJECT_ID>/secrets/INSTANCE_CONNECTION_NAME_STAGING/versions/<SECRET_VERSION>
      env: INSTANCE_CONNECTION_NAME_STAGING
    - versionName: projects/<PROJECT_ID>/secrets/APP_KEYS_STAGING/versions/<SECRET_VERSION>
      env: APP_KEYS_STAGING
    - versionName: projects/<PROJECT_ID>/secrets/API_TOKEN_SALT_STAGING/versions/<SECRET_VERSION>
      env: API_TOKEN_SALT_STAGING
    - versionName: projects/<PROJECT_ID>/secrets/ADMIN_JWT_SECRET_STAGING/versions/<SECRET_VERSION>
      env: ADMIN_JWT_SECRET_STAGING
    - versionName: projects/<PROJECT_ID>/secrets/TRANSFER_TOKEN_SALT_STAGING/versions/<SECRET_VERSION>
      env: TRANSFER_TOKEN_SALT_STAGING
    - versionName: projects/<PROJECT_ID>/secrets/JWT_SECRET_STAGING/versions/<SECRET_VERSION>
      env: JWT_SECRET_STAGING
```

- **steps**: Define cada paso que se desee realizar. Los pasos se ejecutan en un contenedor de Docker aislado de los demas pasos.
  - **name**: url de la imagen de Docker a utilizar. En este caso se utiliza la gcloud-sdk para poder acceder a todos los comandos de gcloud.
  - **entrypoint**: La shell a utilizar.
  - **args**: los comandos que se ejecutaran dentro del entrypoint.
  - **secretEnv**: Variables de entorno dentro del entorno de la imagen que se esta corriendo. Para usar estas variables es necesario agregar el prefijo \$$ al nombre de la varaible. E.g.: \$$HOST. Tambien esta la opcion **env**, la diferencia es que no estan encriptadas y para utilizarlas se utiliza "\${}". E.g.: ${HOST}
- **availableSecrets/secretManager**: Dentro se definen los secretos de Secret Manager.
  - **versionName**: Ruta del secreto a llamar. Sigue la sintaxis "projects/PROJECT_ID/secrets/SECRET_NAME/versions/VERSION". Donde PROJECT_ID es el id del proyecto, SECRET_NAME el nombre del secreto y VERSION la version de ese secreto.
  - **env**: El nombre de la varaible de entorno a la cual se le asignara el valor obtenido del secreto.

Para mas info de como acceder a los valores de Secret Manager a traves de Cloud Build ver [aqui](https://cloud.google.com/build/docs/securing-builds/use-secrets). Para mas informacion con respecto al archivo de configuracion de Cloud BUild ver [aqui](https://cloud.google.com/build/docs/build-config-file-schema#structure_of_a_build_config_file).

Dentro de la opcion **args** se puede observar la llamada al comando `sed -i` para modificar el archivo _"app.yaml"_. Esto es para reemplazar la variables de entorno definidas alli, en las cuales todos su valores estan envueltos entre %%. Estos simbolos sirven como delimitadores visuales para saber que deben ser reemplazados. Luego el comando coloca el valor de la variable de entorno correspondiente declarada dentro de secretEnv. La opcion `/g` define que el reemplazo debe ser global, es decir que todas las coincidencias deben ser cambiadas. Esta solucion fue inspirada en la siguiente [solucion](https://stackoverflow.com/questions/52840187/how-to-set-environment-variables-using-google-cloud-build-or-other-method-in-goo)

## NextJS

Para el despliegue del sitio se utiliza Cloud Run. Se crea un nuevo serivicio desde la interfaz de la consola de gcp. Se puede seleccionar la opcion de despliegue continuo desde el repositorio. Al seleccionar esta opcion se creara automaticamente un trigger global en Cloud Build que constriuira la imagen de Docker y la desplegara en Cloud Run. Todos los builds ejecutados subiran una copia de la imagen a Artifact Registry, esto sirve para el mantener un versionamiento de todos los builds. Para la construccion de la imagen se puede utilizar un Dockerfile personalizado o buildpacks. Se utilizaran buildpacks los cuales detectan automaticamente el lenguaje del proyecto y generan una imagen optimizada.

Completada la configuracion de Cloud Run se modifica el trigger creado. Se cambia el nombre, la region, la fuente y los archivos incluidos y omitidos.

### Variables de entorno y `cloudbuild.yaml`

Dado que se utiliza la construcción predeterminada de Cloud Build para obtener el código desde el repositorio, el archivo cloudbuild.yaml también se incluye por defecto. A continuación, se detallan los pasos definidos en dicho archivo.

**1- Build de la imagen con Buildpacks**

```yaml
- name: gcr.io/k8s-skaffold/pack
    args:
      - build
      - >-
        $_AR_HOSTNAME/$PROJECT_ID/cloud-run-source-deploy/$REPO_NAME/$_SERVICE_NAME:$COMMIT_SHA
      - '--builder=gcr.io/buildpacks/builder:v1'
      - '--network=cloudbuild'
      - '--path=teleferico-app'
      - '--env=BUILD_STRAPI_BASE_URL=$_BUILD_STRAPI_BASE_URL'
      - '--env=BUILD_STRAPI_BUCKET_HOSTNAME=$_BUILD_STRAPI_BUCKET_HOSTNAME'
      - '--env=BUILD_STRAPI_BUCKET_PATHNAME=$_BUILD_STRAPI_BUCKET_PATHNAME'
    id: Buildpack
    entrypoint: pack
```

Usa Buildpacks para construir una imagen Docker sin Dockerfile. El código fuente está en el directorio teleferico-app. Crea una imagen con un tag que incluye el nombre del servicio y el commit SHA. Usa el buildpack oficial de Google (gcr.io/buildpacks/builder:v1).

**2- Pushea la imagen al Artifact Registry**

```yaml
- name: gcr.io/cloud-builders/docker
  args:
    - push
    - $_AR_HOSTNAME/$PROJECT_ID/cloud-run-source-deploy/$REPO_NAME/$_SERVICE_NAME:$COMMIT_SHA
  id: Push
```

Pushea la imagen construida al Artifact Registry de tu proyecto GCP.

**3- Despliegue a Cloud Run**

```yaml
- name: "gcr.io/google.com/cloudsdktool/cloud-sdk:slim"
  entrypoint: gcloud
  args:
    - run
    - services
    - update
    - $_SERVICE_NAME
    - "--platform=managed"
    - --image=...
    - --labels=...
    - "--region=$_DEPLOY_REGION"
    - "--quiet"
    - --set-env-vars=...
  id: Deploy
```

Usa gcloud para actualizar el servicio de Cloud Run. Le pasa la imagen recién subida. Le agrega algunas etiquetas para trazabilidad (commit-sha, build-id, etc). Le asigna variables de entorno.

**Variables de entorno**

Como se puede observar, se definen variables de entorno en los pasos 1 y 3 del builder. Esto se debe a que las variables utilizadas en el archivo de configuración de Next.js `next.config.mjs` deben estar disponibles en tiempo de compilación (build-time), ya que dicho archivo se evalúa fuera del contexto de ejecución de Node.js. Por otro lado, las variables definidas en el paso 3 mediante `--set-env-vars` están destinadas al entorno de ejecución (runtime) de Cloud Run.

Para saber que variables de entorno deben declararse en build time, se utilizará la convención de prefijo `BUILD_` para sus nombres dentro del archivo `.env.example`.

# Flujo de Trabajo con Git 🔀

Este flujo de trabajo utiliza tres ramas principales: `main`, `staging` y `development`. Todos los merges se realizan a través de Pull Requests en GitHub para asegurar revisión y calidad del código.

## Ramas

- **main**:

  - Asociada con el entorno de **producción**.
  - Se despliega directamente en producción.

- **staging**:

  - Asociada con el entorno de **staging**.
  - Se despliega en el entorno de staging para pruebas previas a la producción.

- **development**:

  - Ramas de desarrollo donde se crean y mergean las distintas **features**.
  - Cuando una feature está lista, se hace un **merge** a `development`.

- **docs**:

  - Exclusiva para modificaciones a archivos de documentacion.
  - Mergea a `main` y `development`
  - No implica que las modificaciones a archivos de documentacion se realicen unicamente en esta rama. Es decir que la documentacion puede ser actualizada en otras ramas.

- **feat/FEATURE_NAME**:

  - Los cambios realizados tienen que estar relacionados con la feature.
  - Mergean unicamente a `development` a traves de Pull Request.

- **fix/FIX_NAME**:
  - Contienen hotfix.
  - Mergean a `development` y/o `staging` a traves de Pull Request

## Flujo de Trabajo

1.  **Desarrollo de Features**:

    Crear una rama nueva desde `development` para cada nueva feature y pushearla al repo remoto:

    ```
    git switch -c feat/nueva-feature development
    git push --set-upstream origin feat/nueva-feature
    ```

2.  **Merge de Features/Fixes**:

    Una vez completada la feature, crear una Pull Request a `development`. En caso de que sea un fix, crear PR tambien a `staging`.
    Aprobada la PR, se debe eliminar la rama asociada a la feature o fix del repositorio remoto.

3.  **Despliegue en Staging**:

    Cuando `development` está listo para ser probado, crear una Pull Request a `staging`:

    Despliegue automático de `staging` en el entorno de staging gracias a los **triggers configurados en Cloud Build**.

4.  **Despliegue en Producción**:

    Una vez que todo está probado en `staging`, crear Pull Request a `main`:

    Despliegue automático de `main` en producción también gracias a los **triggers configurados en Cloud Build**.

## Convención para mensajes de commit

Para asegurar historial consistente usamos el formato de [Conventional Commits](https://www.conventionalcommits.org/):

- Formato: `<tipo>(<directorio>/alcance): descripción en inglés`.
- Tipos admitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `perf`, `build`, `ci`, `chore`, `revert`. Elegir el que mejor describa el cambio.
- Directorios admitidos:
  - `app`: Cambios dentro del directorio _./teleferico-app_
  - `cms`: Cambios dentro del directorio _./teleferico-cms_
  - `root`: Cambios dentro del directorio _./_ y fuera de los directorios _./teleferico-app_ y _./teleferico-cms_
- El alcance puede ser cualquier palabra que haga referencia al alcance general que englobe todos los cambios de ese commit (nombre de archivo, entidad, nombre de un directorio, funcionalidad, etc.).
- La descripción debe ser concisa (≤72 caracteres) y enfocada en el resultado del cambio.
- El cuerpo es opcional; úsalo para detallar el porqué del cambio o pasos extra. Referencias a issues o tickets van al final como `Refs: ABC-123`.

Ejemplo completo:

```
feat(app/auth): implement session verification and expiration handling in JWT callback
```

## Convencion para Pull Request

En una nueva terminal situarse sobre el directorio raíz del proyecto y cambiar a la rama que se desea mergear. Ejecutar el comando `git diff <branch_name>...HEAD > ./tmp-pr-diff.txt` donde `<branch_name>` es el nombre de la rama que recibirá el merge.

**Ejemplo**

```bash
git switch feat/forms
git diff develop...HEAD
```

Luego copiar en la IA el siguiente prompt y adjuntar el archivo generado.

```
You are an assistant that writes Pull Request descriptions for my project.

Follow these strict rules:
- Write the PR description in **English**.
- Format the output in **Markdown**.
- Follow EXACTLY this structure and headings:
  1. Summary
  2. Context
  3. Changes
  4. Technical Details
  5. Breaking Changes (only if they exist)
- Do NOT invent features or changes that are not clearly supported by the diff.
- Group changes by logical area (e.g., Frontend/UI, Backend/API, Types/Schemas).
- Be concise but clear.
- Do NOT propose commit messages.
- Do NOT mention branch names.
- Do NOT include any instruction text, only the final PR description.

Use the following template as reference:

## Summary
- ...

## Context
- ...

## Changes
- ...

## Technical Details
- ...

## Breaking Changes
- [ ] (explain impact)

Now, based ONLY on the .txt diff file attached, write the PR description
In a new terminal go into projects directory, switch to the branch you want to compare with (the one who merges) anda execute
`git diff <branch_name>...HEAD > ./tmp-pr-diff.txt`

```
