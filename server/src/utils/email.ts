import sgMail from '@sendgrid/mail';
import { env } from '../config/env';
import { logger } from '../config/logger';

sgMail.setApiKey(env.SENDGRID_API_KEY);

export const sendEmail = async (to: string, subject: string, htmlBody: string): Promise<void> => {
  try {
    await sgMail.send({
      to,
      from: env.EMAIL_FROM,
      subject,
      html: htmlBody,
    });
    logger.info({ to, subject }, 'Email sent');
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to send email');
    // Do not re-throw — email failures must not block the main operation
  }
};
