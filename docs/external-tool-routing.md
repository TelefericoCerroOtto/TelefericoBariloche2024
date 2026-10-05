# External Tool Routing

Route work to the right tool and source before acting. Discover the tools actually exposed in the current runtime; a tool named in configuration or remembered from another session is not proof that it is available or working. Follow each tool's current authorization and the repository's linked governance before any read or write.

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
- Apply the [backlog workflow](todo-workflow.md) and [change-intake preflight](change-intake-preflight.md). A read, a write, or a new destination still needs its applicable authorization.

## GitHub CLI (`gh`)

- Use `gh` only for the explicitly authorized repository, operation, and current credential/session. Scope repository commands with `--repo <owner>/<repo>`; use `TelefericoCerroOtto/TelefericoBariloche2024` when that is the authorized destination.
- Treat reads and writes separately. A read authorization does not authorize a write, and ambient login state or consent from another session is not authorization.
- Discover and verify that `gh` is available before relying on it. If the authorized scope or current session is unclear, stop and ask rather than probing other repositories or exposing authentication output.
- Follow [root GitHub authorization and PR governance](../AGENTS.md#authorized-read-only-github-and-notion-access) and [change-intake preflight](change-intake-preflight.md) for the requested operation.

## Google Cloud SDK (`gcloud`)

- Prefer the existing authenticated `google-cloud-sdk` container for project `gcloud` work, not host `gcloud`. Discover the available Docker MCP tools and their schemas before use. For managed Redis/Memorystore and alerting operations, [infrastructure guidance](INFRA.md) specifically requires Docker MCP and this running container; never bypass that route with Docker CLI.
- Check only the existing container's running state (for example, `docker container inspect --format '{{.State.Running}}' google-cloud-sdk`). If stopped, start only that container with an available, authorized start operation (for example, `docker start google-cloud-sdk` when local Docker CLI is permitted). Do not create or rebuild containers. If no safe start operation is available, stop and ask.
- For an authorized operation, use the actual Docker MCP execute tool when available; do not invent tool names or arguments. For other operations not bound to Docker MCP, local Docker CLI may run a scoped command inside the container as `docker exec google-cloud-sdk gcloud <scoped-command>` when that route is permitted. Never substitute host `gcloud` or use this fallback for an operation that requires Docker MCP.
- Do not invoke `gcloud auth` commands, inspect credential files, or expose authentication output. An account listing alone would not prove the required API access. If authentication is expired or missing, ask the operator to restore it interactively in the container (for example, `docker exec -it google-cloud-sdk gcloud auth login`, then follow its browser/code prompts, including `R` if offered). Never run this login for the operator or handle their authorization code.
- Only when current authorization includes GCP reads, use a harmless, narrowly scoped API read as needed to confirm access. Apply the [GCP command approval and dry-run rules](../AGENTS.md#gcp-cli-operational-rules) and the [infrastructure guidance](INFRA.md): sensitive reads, production changes, destructive or hard-to-revert changes, and ambiguous commands require the stated approval. A preview does not authorize applying the real change. If Docker MCP is unavailable for an operation that requires it, stop; do not bypass it.

## Unavailable or ambiguous tools

- Prefer the tool exposed and authorized for the requested system; do not substitute a different system or destination.
- When a required tool is absent, blocked, or cannot be safely verified, say what is unavailable and stop before its operation. Ask one focused clarification only when the target or authorization is ambiguous.
