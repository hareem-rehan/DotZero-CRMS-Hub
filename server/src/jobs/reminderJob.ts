import cron from 'node-cron';
import { prisma } from '../config/db';
import { sendEmail } from '../utils/email';
import { reminderEmail } from '../utils/emailTemplates';
import { logger } from '../config/logger';

const REMINDER_THRESHOLD_HOURS = 48;

async function sendReminders() {
  const threshold = new Date(Date.now() - REMINDER_THRESHOLD_HOURS * 60 * 60 * 1000);

  // Find SUBMITTED CRs older than 48h with no reminder sent yet
  const stuckCRs = await prisma.changeRequest.findMany({
    where: {
      status: 'SUBMITTED',
      dateOfRequest: { lte: threshold },
      lastReminderSentAt: null,
    },
    include: {
      project: { select: { name: true, assignedDmId: true } },
    },
  });

  if (stuckCRs.length === 0) return;

  logger.info(`[reminderJob] Found ${stuckCRs.length} stuck CR(s) — sending reminders`);

  for (const cr of stuckCRs) {
    if (!cr.project.assignedDmId) continue;

    const dm = await prisma.user.findUnique({
      where: { id: cr.project.assignedDmId },
      select: { email: true, name: true, notifyOnCrSubmitted: true },
    });
    if (!dm) continue;

    const hoursStuck = Math.floor(
      (Date.now() - (cr.dateOfRequest?.getTime() ?? Date.now())) / (1000 * 60 * 60),
    );

    try {
      const tpl = reminderEmail(dm.name, cr.crNumber, cr.project.name, hoursStuck, cr.id);
      await sendEmail(dm.email, tpl.subject, tpl.html);

      await prisma.changeRequest.update({
        where: { id: cr.id },
        data: { lastReminderSentAt: new Date() },
      });

      logger.info(`[reminderJob] Reminder sent for CR ${cr.crNumber} (${hoursStuck}h stuck)`);
    } catch (err) {
      logger.error(`[reminderJob] Failed to send reminder for CR ${cr.crNumber}: ${String(err)}`);
    }
  }
}

export function startReminderJob() {
  // Run every hour
  cron.schedule('0 * * * *', () => {
    sendReminders().catch((err) => logger.error(`[reminderJob] Unexpected error: ${String(err)}`));
  });
  logger.info('[reminderJob] 48hr reminder cron scheduled (every hour)');
}
