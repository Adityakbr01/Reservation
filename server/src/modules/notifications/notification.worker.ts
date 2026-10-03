import { logger } from "../../config/logger";
import { processDueNotification, runReminderSweep } from "./notification.service";

const WORKER_INTERVAL_MS = 30_000;
const REMINDER_INTERVAL_MS = 5 * 60_000;

let workerTimer: ReturnType<typeof setInterval> | null = null;
let reminderTimer: ReturnType<typeof setInterval> | null = null;
let running = false;

/**
 * In-process notification worker (docs 06 §50-52 — dedicated processes
 * can split out later). Drains the queue every 30s and runs the
 * check-in reminder sweep every 5 minutes. Failures are contained per
 * row: a bad notification never stops the loop.
 */
export function startNotificationWorker(): void {
  if (workerTimer) return;
  const drain = async () => {
    if (running) return;
    running = true;
    try {
      for (let i = 0; i < 25; i += 1) {
        const claimed = await processDueNotification(new Date());
        if (!claimed) break;
      }
    } catch (error) {
      logger.error("Notification worker drain failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      running = false;
    }
  };
  const sweep = async () => {
    try {
      const enqueued = await runReminderSweep(new Date());
      if (enqueued > 0) logger.info("Check-in reminders enqueued", { enqueued });
    } catch (error) {
      logger.error("Reminder sweep failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  workerTimer = setInterval(() => void drain(), WORKER_INTERVAL_MS);
  reminderTimer = setInterval(() => void sweep(), REMINDER_INTERVAL_MS);
  void drain();
  logger.info("Notification worker started");
}

export function stopNotificationWorker(): void {
  if (workerTimer) clearInterval(workerTimer);
  if (reminderTimer) clearInterval(reminderTimer);
  workerTimer = null;
  reminderTimer = null;
}
