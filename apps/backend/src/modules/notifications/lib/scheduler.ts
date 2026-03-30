import cron from "node-cron";

import { logger } from "../../../core/config";
import type { NotificationsService } from "../module.service";

export const startNotificationsScheduler = (options: {
  notificationsService: NotificationsService;
  enabled: boolean;
  inactivityCron: string;
}) => {
  if (!options.enabled) {
    return () => undefined;
  }

  if (!cron.validate(options.inactivityCron)) {
    logger.warn(
      {
        inactivityCron: options.inactivityCron,
      },
      "Notifications scheduler was not started because the inactivity cron expression is invalid",
    );
    return () => undefined;
  }

  const inactivityTask = cron.schedule(options.inactivityCron, () => {
    void options.notificationsService.runInactivityReminderJob()
      .then((result) => {
        logger.info(
          {
            result,
          },
          "Completed inactivity reminder job",
        );
      })
      .catch((error) => {
        logger.error(
          {
            err: error,
          },
          "Inactivity reminder job failed",
        );
      });
  });

  logger.info(
    {
      inactivityCron: options.inactivityCron,
    },
    "Notifications scheduler started",
  );

  return () => {
    inactivityTask.stop();
    inactivityTask.destroy();
  };
};
