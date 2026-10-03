import type {
  WorkerAlertIntentV1,
  WorkerRuntimeDependencies,
} from "./contracts";

export async function deliverPendingWorkerAlerts(input: {
  readonly reportRunId: string;
  readonly alerts: readonly WorkerAlertIntentV1[];
  readonly dependencies: Pick<WorkerRuntimeDependencies, "cms" | "usageNotifier">;
}): Promise<void> {
  const notifier = input.dependencies.usageNotifier;
  if (typeof notifier !== "function") return;

  for (const alert of input.alerts) {
    if (alert.reportRunId !== input.reportRunId) continue;
    try {
      const acceptance = await notifier(alert);
      if (acceptance?.accepted !== true || acceptance.idempotencyKey !== alert.deduplicationKey)
        continue;
      await input.dependencies.cms.acknowledgeAlert(input.reportRunId, {
        contractVersion: "survey-worker-alert-ack.v1",
        deduplicationKey: alert.deduplicationKey,
      });
    } catch {
      // The durable CMS intent stays pending for the next delivery or resume.
    }
  }
}
