# External Tool Routing

Route work to the right tool and source before acting. Discover the tools actually exposed in the current runtime; a tool named in configuration or remembered from another session is not proof that it is available or working. Task-scoped read-only consultations do not require separate repository-semantic authorization. Runtime tool permissions remain in force, and writes continue to follow their applicable authorization and repository governance.

## OpenDesign MCP

- Use the project explicitly requested or referenced by the task's existing design evidence. As a default, established/current design-system work routes to `teleferico-cerro-otto-design-system`; work explicitly framed as Evolution or anchored to Evolution evidence routes to `teleferico-cerro-otto-design-system-evolution`.
- These are general design-system destinations, not projects reserved for particular UI surfaces. The TB-113 mapping of administration work to the current project and public-form work to Evolution is an example for that change only.
- Do not assume a project from a similar name, file, or UI surface, and do not silently read or write a different project. If the requested project cannot be inferred from the task and its existing references, ask one clarification before acting.
- Discover the available OpenDesign MCP tools and project/file operations in the current runtime. Do not assume OpenDesign is configured or exposed because it appears in repository design evidence.
- Use the current project/file revision exposed by the tool; do not hardcode or infer a revision. Confirm the exact target before a write.
- These project IDs are recorded in the [TB-113 design evidence](../openspec/changes/tb-113-visitor-feedback/design/06-migration-testing-rollout.md). That document governs its UI-design scope; its references do not make OpenDesign available in every runtime.

## Notion MCP

- For backlog reads and writes, use only the canonical [Backlog unificado](https://app.notion.com/p/adf69803af2149a1a98fe5afa6f95be5) database (ID `adf69803-af21-49a1-a98f-e5afa6f95be5`; data source `c0734f69-87ea-43ca-a757-3bb80a41cbbc`). Never use a suffixed copy.
- For current organizational context, start separately from [00 — LEER PRIMERO — Notion Teleférico Cerro Otto](https://app.notion.com/p/3dca58c3fefc81f89064cc55729b7ec5); it is not the backlog database.
- Confirm the Notion MCP is exposed and usable in this runtime. If unavailable, report that limitation; do not claim the backlog or live context was checked or changed.
- Apply the [backlog workflow](todo-workflow.md) and [change-intake preflight](change-intake-preflight.md). Task-scoped reads may consult an identified canonical source without separate repository-semantic approval; creating or changing destinations and writes still need their applicable authorization.

## GitHub CLI (`gh`)

- Use `gh` only for the identified repository and current active session. Scope repository commands with `--repo <owner>/<repo>`; use `TelefericoCerroOtto/TelefericoBariloche2024` when that is the requested destination.
- Task-scoped read-only consultations of the identified repository do not require separate repository-semantic approval. Reads never authorize writes; ambient login state or consent from another session is not authorization for a write.
- Discover and verify that `gh` is available before relying on it. If the repository target or current session is unclear, stop and ask rather than probing other repositories or exposing authentication output.
- Follow [implementation-PR publication governance](../AGENTS.md#implementation-pr-finalization) and [change-intake preflight](change-intake-preflight.md) for publication requests.

## Google Cloud SDK (`gcloud`)

- Prefer the existing authenticated `google-cloud-sdk` container for project `gcloud` work, not host `gcloud`. Discover the available Docker MCP tools and their schemas before use. For managed Redis/Memorystore and alerting operations, [infrastructure guidance](INFRA.md) specifically requires Docker MCP and this running container; never bypass that route with Docker CLI.
- Check only the existing container's running state (for example, `docker container inspect --format '{{.State.Running}}' google-cloud-sdk`). If stopped, start only that container with an available, authorized start operation (for example, `docker start google-cloud-sdk` when local Docker CLI is permitted). Do not create or rebuild containers. If no safe start operation is available, stop and ask.
- For task-scoped reads and separately authorized changes, use the actual Docker MCP execute tool when available; do not invent tool names or arguments. For other operations not bound to Docker MCP, local Docker CLI may run a scoped command inside the container as `docker exec google-cloud-sdk gcloud <scoped-command>` when that route is permitted. Never substitute host `gcloud` or use this fallback for an operation that requires Docker MCP.
- Do not invoke `gcloud auth` commands, inspect credential files, or expose authentication output. An account listing alone would not prove the required API access. If authentication is expired or missing, ask the operator to restore it interactively in the container (for example, `docker exec -it google-cloud-sdk gcloud auth login`, then follow its browser/code prompts, including `R` if offered). Never run this login for the operator or handle their authorization code.
- Use harmless, narrowly scoped API reads needed for the task without separate repository-semantic approval, including non-secret IAM and Secret Manager metadata observations. Never read credential files or retrieve or expose secret values. Runtime tool permissions remain binding. Apply the [GCP command approval and dry-run rules](../AGENTS.md#gcp-cli-operational-rules) and the [infrastructure guidance](INFRA.md): production changes and destructive or hard-to-revert changes require the stated approval. If a command's target or effects are ambiguous, clarify or classify it before running; a confirmed read-only consultation needs no separate repository-semantic approval, while a classified mutation needs its applicable approval. A preview does not authorize applying the real change. If Docker MCP is unavailable for an operation that requires it, stop; do not bypass it.

## Unavailable or ambiguous tools

- Prefer the available tool appropriate for the requested system; do not substitute a different system or destination. Runtime tool permissions remain binding.
- When a required tool is absent, blocked, or cannot be safely verified, say what is unavailable and stop before its operation. Ask one focused clarification when the target is ambiguous, or when required authorization for a write/operational change is unclear.
