# Normative Threat Matrix

## Reference Rows

- **Documentation-like paths — N/A:** infra docs/config are never dynamically executed.
- **Git repository selection — N/A:** no repository/cwd argument construction.
- **Commit state — N/A:** no index/worktree interpretation.
- **Push state — N/A:** no tracking/refspec behavior.
- **PR commands — N/A:** no PR argument/ownership composition.

N/A rows require no task/test.

## Applicable Boundaries

### HTTP routing

**Cases:** encoded/malformed/overlong code or ID; dot/extra segment; wrong method/media/size; unknown fields/query; direct CMS/worker browser call; missing origin/session/CSRF/capability; download enumeration.

**Safe/failure:** exact methods/closed schemas; unavailable public resolution is 410 `SURVEY_UNAVAILABLE`; mutations enforce origin→session/CSRF→capability→validation→downstream. Appendix-02 errors cause zero forbidden calls/log disclosure.

**RED:** app routes, `src/lib/feedback/http-contract.test.ts`, and both feedback E2E specs cover all cases.

### Shell/subprocess harness

**Cases:** remote/staging/production database; metacharacters; alternate compose path; child failure/signal; stale container/volume.

**Safe/failure:** fixed repo path/argument arrays, never `shell:true`; localhost plus `tb113_test_`; unique project; children-first/volume cleanup. Reject before connect/spawn, preserve exit, never broaden deletion.

**RED:** CMS `test/feedback/harness/process-boundary.test.js` covers every case before runner implementation.

### Cloud Tasks→worker

**Cases:** create transient/auth/config/exhaustion; duplicate name same/different run; invalid OIDC issuer/audience/principal; wrong route/method; duplicate/altered delivery; stale CAS; timeout/redelivery; post-create delivery exhaustion; terminal replay.

**Safe/failure:** deterministic name/run binding; only Next.js retries creation and performs idempotent queued→failed compensation after bounded pre-claim exhaustion. Successful creation transfers retry ownership to Cloud Tasks and forbids that compensation. Worker authenticates before CMS, follows digest dependencies, skips valid stages, and returns bounded bodies; no identity/stale/terminal case duplicates model/report/object/alert.

**RED:** app dispatch-coordinator, worker OIDC/task/duplicate-delivery, and CMS dispatch-failure/worker-route contract tests use fakes for every case.

### Next.js↔CMS

**Cases:** browser direct access; token used across route families; under-capable JWT; upstream leak; same nonce/key with different digest; concurrent range; incomplete completion.

**Safe/failure:** family-specific credentials/policies, CMS reauthorization, no generic CRUD, transactional unique/CAS authority, bounded responses; deny/rollback without secrets.

**RED:** CMS authorization/idempotency/generation-concurrency/atomic-completion tests plus app guard-order tests. All applicable cases enter `tasks.md` unchanged.
