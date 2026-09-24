const assert = require("node:assert/strict");
const { Pool } = require("pg");
const test = require("node:test");
const { COMPOSE_FILE, DOCKER_EXECUTABLE, executeFixed } = require("../harness/postgres-harness");
const { createGenerationLifecycle } = require("../../../src/api/survey-report-generation/services/lifecycle");
const OWNER = "tb113_test_generation_lifecycle";
const compose = (...args) => executeFixed(DOCKER_EXECUTABLE, ["compose", "--file", COMPOSE_FILE, "--project-name", OWNER, ...args]);

function postgresTransaction(pool) {
  return async (operation) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let lockedRunId;
      const result = await operation({
        async lockGeneration(reportRunId) {
          lockedRunId = reportRunId;
          const { rows } = await client.query(
            "SELECT document_id AS \"documentId\", report_run_id AS \"reportRunId\", period_start AS \"periodStart\", period_end AS \"periodEnd\", data_cutoff_at AS \"dataCutoffAt\", snapshot_digest AS \"snapshotDigest\", source_revision AS \"sourceRevision\", status, state_version AS \"stateVersion\", task_name AS \"taskName\", dispatch_state AS \"dispatchState\", dispatch_evidence_json AS \"dispatchEvidenceJson\", dispatch_attempt_count AS \"dispatchAttemptCount\", failure_code AS \"failureCode\" FROM survey_report_generations WHERE report_run_id = $1 FOR UPDATE",
            [reportRunId],
          );
          return rows[0];
        },
        async insertReport(report) {
          await client.query(
            "INSERT INTO survey_reports(report_id, generation_run_id, period_start, period_end, data_cutoff_at, snapshot_digest, source_revision, validated_analysis_json, analysis_contract_version, analysis_digest, renderer_version, object_key, artifact_sha256, artifact_size, mime_type, source_generation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)",
            [report.reportId, report.generationRunId, report.periodStart, report.periodEnd,
              report.dataCutoffAt, report.snapshotDigest, report.sourceRevision,
              report.validatedAnalysisJson, report.analysisContractVersion, report.analysisDigest,
              report.rendererVersion, report.objectKey, report.artifactSha256, report.artifactSize,
              report.mimeType, report.sourceGeneration.connect[0]],
          );
        },
        async updateGeneration(patch) {
          await client.query(
            "UPDATE survey_report_generations SET status = COALESCE($1,status), state_version = $2, completed_at = COALESCE($3,completed_at), task_name = COALESCE($4,task_name), dispatch_state = COALESCE($5,dispatch_state), dispatch_evidence_json = COALESCE($6,dispatch_evidence_json), dispatch_attempt_count = COALESCE($7,dispatch_attempt_count), failure_code = COALESCE($8,failure_code) WHERE report_run_id = $9",
            [patch.status ?? null, patch.stateVersion, patch.completedAt ?? null, patch.taskName ?? null,
              patch.dispatchState ?? null, patch.dispatchEvidenceJson ?? null, patch.dispatchAttemptCount ?? null,
              patch.failureCode ?? null, lockedRunId],
          );
        },
      });
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  };
}

test("PostgreSQL serializes active-range races and rolls back failed completion", async () => {
  let pool;
  try {
    await compose("down", "--volumes", "--remove-orphans", "--timeout=5");
    await compose("up", "--detach", "--wait");
    const port = Number((await compose("port", "postgres", "5432")).stdout.trim().split(":").at(-1));
    pool = new Pool({ host: "127.0.0.1", port, database: "tb113_test_feedback", user: "tb113_test_runner", password: "tb113_test_local_only", max: 4 });
    await pool.query(`CREATE TABLE survey_report_generations(id bigserial PRIMARY KEY, document_id text UNIQUE NOT NULL, report_run_id text UNIQUE NOT NULL, period_start date NOT NULL, period_end date NOT NULL, data_cutoff_at timestamptz NOT NULL, snapshot_digest text NOT NULL, source_revision text NOT NULL, status text NOT NULL, state_version integer NOT NULL DEFAULT 1, completed_at timestamptz, task_name text, dispatch_state text NOT NULL DEFAULT 'unreserved', dispatch_evidence_json jsonb, dispatch_attempt_count integer NOT NULL DEFAULT 0, failure_code text); CREATE TABLE survey_reports(id bigserial PRIMARY KEY, report_id text UNIQUE NOT NULL, generation_run_id text UNIQUE NOT NULL, period_start date NOT NULL, period_end date NOT NULL, data_cutoff_at timestamptz NOT NULL, snapshot_digest text NOT NULL, source_revision text NOT NULL, validated_analysis_json jsonb NOT NULL, analysis_contract_version text NOT NULL, analysis_digest text NOT NULL, renderer_version text NOT NULL, object_key text NOT NULL, artifact_sha256 text NOT NULL, artifact_size bigint NOT NULL, mime_type text NOT NULL, source_generation_id text NOT NULL); CREATE UNIQUE INDEX uq_generation_active_range ON survey_report_generations(period_start,period_end) WHERE status IN ('queued','running');`);
    const insert = async (run) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("INSERT INTO survey_report_generations(document_id,report_run_id,period_start,period_end,data_cutoff_at,snapshot_digest,source_revision,status) VALUES($1,$1,'2026-08-01','2026-08-20','2026-08-20T00:00:00Z',$2,'v1','queued')", [run, "a".repeat(64)]);
        await client.query("COMMIT");
        return true;
      } catch (error) {
        await client.query("ROLLBACK");
        return error.code === "23505" ? false : Promise.reject(error);
      } finally {
        client.release();
      }
    };
    assert.deepEqual((await Promise.all([insert("run-a"), insert("run-b")])).sort(), [false, true]);
    await pool.query("INSERT INTO survey_report_generations(document_id,report_run_id,period_start,period_end,data_cutoff_at,snapshot_digest,source_revision,status,state_version) VALUES('doc-complete','run-complete','2026-09-01','2026-09-10','2026-09-22T00:00:00Z',$1,'v1','running',3)", ["a".repeat(64)]);
    const lifecycle = createGenerationLifecycle({ withTransaction: postgresTransaction(pool), now: () => "2026-09-22T15:04:05.000Z" });
    const completion = {
      reportRunId: "run-complete",
      expectedStateVersion: 3,
      reportId: "report-complete",
      checkpoints: ["redact", "count", "direct", "validate", "render", "store"],
      validatedAnalysis: { schemaVersion: "survey-published-analysis.v1", sections: [] },
      analysisDigest: "c".repeat(64),
      rendererVersion: "renderer.v1",
      artifact: { objectKey: "private/report.pdf", sha256: "b".repeat(64), size: 12, mimeType: "application/pdf" },
    };
    await lifecycle.complete(completion);
    assert.equal((await pool.query("SELECT status FROM survey_report_generations WHERE report_run_id='run-complete'")).rows[0].status, "succeeded");
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM survey_reports WHERE generation_run_id='run-complete'")).rows[0].count, 1);

    await pool.query("INSERT INTO survey_report_generations(document_id,report_run_id,period_start,period_end,data_cutoff_at,snapshot_digest,source_revision,status,state_version) VALUES('doc-failed','run-failed','2026-10-01','2026-10-10','2026-10-22T00:00:00Z',$1,'v1','running',3)", ["a".repeat(64)]);
    await pool.query("ALTER TABLE survey_report_generations ADD CONSTRAINT reject_test_completion CHECK (report_run_id <> 'run-failed' OR status <> 'succeeded')");
    await assert.rejects(lifecycle.complete({ ...completion, reportRunId: "run-failed", reportId: "report-failed" }), { code: "23514" });
    const rollback = await pool.connect();
    try {
      const state = await rollback.query("SELECT status, state_version FROM survey_report_generations WHERE report_run_id='run-failed'");
      const reports = await rollback.query("SELECT count(*)::int AS count FROM survey_reports WHERE generation_run_id='run-failed'");
      assert.deepEqual(state.rows[0], { status: "running", state_version: 3 });
      assert.equal(reports.rows[0].count, 0);
    } finally {
      rollback.release();
    }
  } finally {
    if (pool) await pool.end();
    await compose("down", "--volumes", "--remove-orphans", "--timeout=5");
  }
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ["ps", "-aq", "--filter", `label=com.docker.compose.project=${OWNER}`])).stdout.trim(), "");
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${OWNER}`])).stdout.trim(), "");
});
