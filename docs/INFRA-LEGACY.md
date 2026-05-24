# Teleférico Bariloche — Inventario legacy (solo lectura)

- **Fecha de relevamiento:** 2026-05-11
- **Proyecto GCP:** `teleferico-bariloche`
- **Cuenta activa:** `dev@telefericobariloche.com.ar`
- **Ámbito:** DNS, Compute Engine y serving público visible

## Resumen ejecutivo

El legacy visible en Google Cloud publica el sitio directamente desde una **VM única de Compute Engine** (`teleficobariloche`) con IP pública **35.232.46.188** en `us-central1-a`.

DNS en Cloud DNS apunta ambos dominios al mismo origen. El TLS termina en la propia VM: Apache/CentOS responde en 80/443 y el certificado observado es de **Let’s Encrypt (R13)**.

Hay un detalle importante de certificados: `telefericobariloche.com.ar` cubre apex y subdominios `www`, `en` y `pt`; `telefericobariloche.com` sirve un certificado que cubre `www.telefericobariloche.com`.

## 1) Inventario verificado

| Componente | Evidencia | Detalle |
|---|---|---|
| Proyecto GCP | `gcloud projects describe teleferico-bariloche` | `projectId=teleferico-bariloche`, estado `ACTIVE` |
| Cuenta activa | `gcloud config list`, `gcloud auth list` | `dev@telefericobariloche.com.ar` |
| Cloud DNS | `gcloud dns managed-zones list` | 2 zonas públicas: `telefericobariloche` y `telefericobarilochecom` |
| DNS → origin | `gcloud dns record-sets list` + `gcloud compute instances describe` | Ambos dominios resuelven a `35.232.46.188` |
| Compute Engine VM | `gcloud compute instances list/describe` | `teleficobariloche`, `us-central1-a`, `n1-standard-1`, `RUNNING` |
| Red / firewall | `gcloud compute networks list`, `subnets list`, `firewall-rules list` | Red `default`, subnet `default` en `us-central1`, reglas `default-allow-http/https/ssh/icmp/internal` |
| Disco boot | `gcloud compute disks list`, `instance describe` | 20 GB `pd-standard` asociado a la VM |
| Service account | `gcloud iam service-accounts list`, `instance describe` | `603526357371-compute@developer.gserviceaccount.com` |

## 2) DNS público visible

### Zona `telefericobariloche.com.ar.` (`telefericobariloche`)

| Tipo | Nombre | Destino |
|---|---|---|
| A | `telefericobariloche.com.ar.` | `35.232.46.188` |
| MX | `telefericobariloche.com.ar.` | Google Workspace MX (`aspmx.l.google.com`, `alt1`, `alt2`, `aspmx2-5`) |
| NS | `telefericobariloche.com.ar.` | `ns-cloud-d1/d2/d3/d4.googledomains.com.` |
| SOA | `telefericobariloche.com.ar.` | `ns-cloud-d1.googledomains.com. cloud-dns-hostmaster.google.com. ...` |
| SPF TXT | `telefericobariloche.com.ar.` | `v=spf1 include:_spf.google.com ~all` |
| TXT | `google._domainkey.telefericobariloche.com.ar.` | DKIM publicado |
| A | `dev.telefericobariloche.com.ar.` | `35.232.46.188` |
| A | `en.telefericobariloche.com.ar.` | `35.232.46.188` |
| CNAME | `www.en.telefericobariloche.com.ar.` | `en.telefericobariloche.com.ar.` |
| A | `pt.telefericobariloche.com.ar.` | `35.232.46.188` |
| CNAME | `www.pt.telefericobariloche.com.ar.` | `pt.telefericobariloche.com.ar.` |
| CNAME | `www.telefericobariloche.com.ar.` | `telefericobariloche.com.ar.` |

### Zona `telefericobariloche.com.` (`telefericobarilochecom`)

| Tipo | Nombre | Destino |
|---|---|---|
| A | `telefericobariloche.com.` | `35.232.46.188` |
| NS | `telefericobariloche.com.` | `ns-cloud-e1/e2/e3/e4.googledomains.com.` |
| SOA | `telefericobariloche.com.` | `ns-cloud-e1.googledomains.com. cloud-dns-hostmaster.google.com. ...` |
| CNAME | `www.telefericobariloche.com.` | `telefericobariloche.com.` |

## 3) Compute Engine / serving

| Campo | Valor |
|---|---|
| Nombre | `teleficobariloche` |
| Zona | `us-central1-a` |
| Tipo | `n1-standard-1` |
| Estado | `RUNNING` |
| Imagen/OS | CentOS 7 |
| IP privada | `10.128.0.2` |
| IP pública | `35.232.46.188` |
| Tags | `http-server`, `https-server` |

### Respuesta HTTP/TLS observada

- Servidor: `Apache/2.4.6 (CentOS) OpenSSL/1.0.2k-fips PHP/7.3.21`
- HTTP `80` → `301` a `https://...`
- HTTPS responde `200 OK`
- La app setea cookie `ci_session`

### Certificados TLS observados

| Host | Issuer | Subject | SANs |
|---|---|---|---|
| `telefericobariloche.com` | `Let’s Encrypt / R13` | `CN=www.telefericobariloche.com` | solo `www.telefericobariloche.com` |
| `telefericobariloche.com.ar` | `Let’s Encrypt / R13` | `CN=en.telefericobariloche.com.ar` | `en`, `pt`, `telefericobariloche.com.ar`, `www.en`, `www.pt`, `www.telefericobariloche.com.ar` |

## 4) Riesgos de migración o de tocar DNS/TLS

1. **Un solo punto de falla**: una única VM concentra la publicación.
2. **IP pública no reservada**: la IP depende del access config de la VM.
3. **Riesgo TLS en `telefericobariloche.com`**: el certificado observado no cubre el apex.
4. **Stack legacy EOL**: CentOS 7 + PHP 7.3.21 aumentan el riesgo operacional.
5. **Cambio de DNS/TXT**: la zona `.com.ar` también publica MX/SPF/DKIM.

## 5) Borrador listo para pegar en documentación

> El legacy `teleferico-bariloche` publica el sitio directamente desde una VM única de Compute Engine (`teleficobariloche`) en `us-central1-a`, con IP pública `35.232.46.188`. DNS en Cloud DNS apunta `telefericobariloche.com` y `telefericobariloche.com.ar` a esa IP, y `www` resuelve mediante CNAME al apex.
>
> La VM corre CentOS 7 y responde como `Apache/2.4.6 (CentOS) OpenSSL/1.0.2k-fips PHP/7.3.21`. HTTP redirige a HTTPS y el certificado TLS observado es de Let’s Encrypt (R13). `telefericobariloche.com.ar` tiene un certificado válido para apex y subdominios `www`, `en` y `pt`, mientras que `telefericobariloche.com` sirve un certificado para `www.telefericobariloche.com`.
>
> La publicación depende de una sola VM, así que la IP pública y el TLS deben tratarse como puntos críticos de migración.

## 6) Plan de apagado y respaldo (Mayo 2026)

Con la migración activa hacia el nuevo sitio en `teleferico-bariloche-2024`, el dominio principal `telefericobariloche.com.ar` ya resuelve hacia el nuevo Load Balancer (`130.211.28.132`). Sin embargo, la VM legacy sigue encendida generando costos diarios de Compute Engine.

Para darla de baja de forma segura minimizando costos (aprox. USD 1/mes de retención) sin perder datos históricos (bases de datos y archivos locales de la VM), el plan operativo acordado es:

1. **Snapshot del disco de arranque**: Crear una instantánea del disco `teleficobariloche` (20 GB) para tener un backup exacto del sistema y la base de datos.
2. **Apagar la instancia**: Detener (Stop) la VM `teleficobariloche`.

### Consecuencias esperadas
- **Liberación de IP efímera**: Al apagar la VM, GCP liberará la IP pública `35.232.46.188`. Si a futuro se requiere volver a encender la máquina, se le asignará una nueva IP y habrá que actualizar Cloud DNS manualmente.
- **Caída de subdominios legacy**: Los subdominios que aún apuntan a la IP del legacy (ej. `en.telefericobariloche.com.ar`, `pt.telefericobariloche.com.ar`, `dev...`) dejarán de funcionar inmediatamente.

### Estrategia de recuperación (Rollback)

Si en el futuro se necesita volver a poner en línea el sitio legacy o recuperar los datos operativos, existen dos escenarios:

**Escenario A: La VM sigue existiendo (solo está apagada)**
1. Encender la instancia: `gcloud compute instances start teleficobariloche --zone=us-central1-a --project=teleferico-bariloche`
2. Consultar la nueva IP pública que GCP le asignó al encender.
3. Ir a Cloud DNS y actualizar los registros `A` de los dominios necesarios para que apunten a la nueva IP.

**Escenario B: La VM y el disco original fueron eliminados (restaurar desde backup)**
1. Crear un disco nuevo a partir del snapshot:
   `gcloud compute disks create disco-restaurado-legacy --source-snapshot=legacy-backup-may-2026 --zone=us-central1-a --project=teleferico-bariloche`
2. Crear una nueva instancia adjuntando ese disco como disco de arranque.
3. Consultar la IP pública de la nueva instancia.
4. Actualizar Cloud DNS para apuntar el tráfico a la nueva IP.

