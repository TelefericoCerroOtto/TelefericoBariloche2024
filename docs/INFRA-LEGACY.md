# Teleférico Bariloche — Legacy Inventory (Read-only)

- **Survey Date:** 2026-05-11
- **GCP Project:** `teleferico-bariloche`
- **Active Account:** `dev@telefericobariloche.com.ar`
- **Scope:** DNS, Compute Engine, and visible public serving

## Executive Summary

The visible legacy in Google Cloud publishes the site directly from a **single Compute Engine VM** (`teleficobariloche`) with public IP **35.232.46.188** in `us-central1-a`.

DNS in Cloud DNS points both domains to the same origin. TLS terminates on the VM itself: Apache/CentOS responds on ports 80/443 and the observed certificate is from **Let's Encrypt (R13)**.

There's an important certificate detail: `telefericobariloche.com.ar` covers apex and subdomains `www`, `en`, and `pt`; `telefericobariloche.com` serves a certificate that covers `www.telefericobariloche.com`.

## 1) Verified Inventory

| Component | Evidence | Detail |
|---|---|---|
| GCP Project | `gcloud projects describe teleferico-bariloche` | `projectId=teleferico-bariloche`, status `ACTIVE` |
| Active Account | `gcloud config list`, `gcloud auth list` | `dev@telefericobariloche.com.ar` |
| Cloud DNS | `gcloud dns managed-zones list` | 2 public zones: `telefericobariloche` and `telefericobarilochecom` |
| DNS → origin | `gcloud dns record-sets list` + `gcloud compute instances describe` | Both domains resolve to `35.232.46.188` |
| Compute Engine VM | `gcloud compute instances list/describe` | `teleficobariloche`, `us-central1-a`, `n1-standard-1`, `RUNNING` |
| Network / Firewall | `gcloud compute networks list`, `subnets list`, `firewall-rules list` | Network `default`, subnet `default` in `us-central1`, rules `default-allow-http/https/ssh/icmp/internal` |
| Boot Disk | `gcloud compute disks list`, `instance describe` | 20 GB `pd-standard` associated with the VM |
| Service Account | `gcloud iam service-accounts list`, `instance describe` | `603526357371-compute@developer.gserviceaccount.com` |

## 2) Visible Public DNS

### Zone `telefericobariloche.com.ar.` (`telefericobariloche`)

| Type | Name | Destination |
|---|---|---|
| A | `telefericobariloche.com.ar.` | `35.232.46.188` |
| MX | `telefericobariloche.com.ar.` | Google Workspace MX (`aspmx.l.google.com`, `alt1`, `alt2`, `aspmx2-5`) |
| NS | `telefericobariloche.com.ar.` | `ns-cloud-d1/d2/d3/d4.googledomains.com.` |
| SOA | `telefericobariloche.com.ar.` | `ns-cloud-d1.googledomains.com. cloud-dns-hostmaster.google.com. ...` |
| SPF TXT | `telefericobariloche.com.ar.` | `v=spf1 include:_spf.google.com ~all` |
| TXT | `google._domainkey.telefericobariloche.com.ar.` | Published DKIM |
| A | `dev.telefericobariloche.com.ar.` | `35.232.46.188` |
| A | `en.telefericobariloche.com.ar.` | `35.232.46.188` |
| CNAME | `www.en.telefericobariloche.com.ar.` | `en.telefericobariloche.com.ar.` |
| A | `pt.telefericobariloche.com.ar.` | `35.232.46.188` |
| CNAME | `www.pt.telefericobariloche.com.ar.` | `pt.telefericobariloche.com.ar.` |
| CNAME | `www.telefericobariloche.com.ar.` | `telefericobariloche.com.ar.` |

### Zone `telefericobariloche.com.` (`telefericobarilochecom`)

| Type | Name | Destination |
|---|---|---|
| A | `telefericobariloche.com.` | `35.232.46.188` |
| NS | `telefericobariloche.com.` | `ns-cloud-e1/e2/e3/e4.googledomains.com.` |
| SOA | `telefericobariloche.com.` | `ns-cloud-e1.googledomains.com. cloud-dns-hostmaster.google.com. ...` |
| CNAME | `www.telefericobariloche.com.` | `telefericobariloche.com.` |

## 3) Compute Engine / Serving

| Field | Value |
|---|---|
| Name | `teleficobariloche` |
| Zone | `us-central1-a` |
| Type | `n1-standard-1` |
| Status | `RUNNING` |
| Image/OS | CentOS 7 |
| Private IP | `10.128.0.2` |
| Public IP | `35.232.46.188` |
| Tags | `http-server`, `https-server` |

### Observed HTTP/TLS Response

- Server: `Apache/2.4.6 (CentOS) OpenSSL/1.0.2k-fips PHP/7.3.21`
- HTTP `80` → `301` to `https://...`
- HTTPS responds `200 OK`
- The app sets cookie `ci_session`

### Observed TLS Certificates

| Host | Issuer | Subject | SANs |
|---|---|---|---|
| `telefericobariloche.com` | `Let's Encrypt / R13` | `CN=www.telefericobariloche.com` | only `www.telefericobariloche.com` |
| `telefericobariloche.com.ar` | `Let's Encrypt / R13` | `CN=en.telefericobariloche.com.ar` | `en`, `pt`, `telefericobariloche.com.ar`, `www.en`, `www.pt`, `www.telefericobariloche.com.ar` |

## 4) Migration Risks and DNS/TLS Handling Risks

1. **Single Point of Failure**: A single VM concentrates all publishing.
2. **Non-reserved Public IP**: The IP depends on the VM's access config.
3. **TLS Risk for `telefericobariloche.com`**: The observed certificate doesn't cover the apex domain.
4. **Legacy EOL Stack**: CentOS 7 + PHP 7.3.21 increase operational risk.
5. **DNS/TXT Changes**: The `.com.ar` zone also publishes MX/SPF/DKIM.

## 5) Draft Ready for Documentation

> The `teleferico-bariloche` legacy publishes the site directly from a single Compute Engine VM (`teleficobariloche`) in `us-central1-a`, with public IP `35.232.46.188`. DNS in Cloud DNS points `telefericobariloche.com` and `telefericobariloche.com.ar` to that IP, and `www` resolves via CNAME to the apex.
>
> The VM runs CentOS 7 and responds as `Apache/2.4.6 (CentOS) OpenSSL/1.0.2k-fips PHP/7.3.21`. HTTP redirects to HTTPS and the observed TLS certificate is from Let's Encrypt (R13). `telefericobariloche.com.ar` has a valid certificate for apex and subdomains `www`, `en`, and `pt`, while `telefericobariloche.com` serves a certificate for `www.telefericobariloche.com`.
>
> Publishing depends on a single VM, so the public IP and TLS must be treated as critical migration points.

## 6) Shutdown and Backup Plan (May 2026)

With active migration to the new site at `teleferico-bariloche-2024`, the main domain `telefericobariloche.com.ar` already resolves to the new Load Balancer (`130.211.28.132`). However, the legacy VM remains active, generating daily Compute Engine costs.

To safely shut it down minimizing costs (approx. USD 1/month retention) without losing historical data (VM databases and local files), the agreed operational plan is:

1. **Boot Disk Snapshot**: Create a snapshot of the `teleficobariloche` disk (20 GB) to have an exact backup of the system and database.
2. **Shut Down Instance**: Stop the `teleficobariloche` VM.

### Expected Consequences
- **Ephemeral IP Release**: When shutting down the VM, GCP will release public IP `35.232.46.188`. If the machine needs to be restarted in the future, it will be assigned a new IP and Cloud DNS will need to be updated manually.
- **Legacy Subdomain Downtime**: Subdomains still pointing to the legacy IP (e.g., `en.telefericobariloche.com.ar`, `pt.telefericobariloche.com.ar`, `dev...`) will stop working immediately.

### Recovery Strategy (Rollback)

If in the future the legacy site needs to be brought back online or operational data recovered, there are two scenarios:

**Scenario A: The VM Still Exists (Only Stopped)**
1. Start the instance: `gcloud compute instances start teleficobariloche --zone=us-central1-a --project=teleferico-bariloche`
2. Check the new public IP that GCP assigns when starting.
3. Go to Cloud DNS and update the necessary domain `A` records to point to the new IP.

**Scenario B: The VM and Original Disk Were Deleted (Restore from Backup)**
1. Create a new disk from the snapshot:
   `gcloud compute disks create disco-restaurado-legacy --source-snapshot=legacy-backup-may-2026 --zone=us-central1-a --project=teleferico-bariloche`
2. Create a new instance attaching that disk as the boot disk.
3. Check the new instance's public IP.
4. Update Cloud DNS to point traffic to the new IP.