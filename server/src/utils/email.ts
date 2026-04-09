import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';

const USE_SENDGRID = env.SENDGRID_API_KEY.startsWith('SG.');
const USE_GMAIL = !USE_SENDGRID && !!env.SMTP_USER && !!env.SMTP_PASS;

if (USE_SENDGRID) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
}

// Gmail transporter (reused across calls)
let gmailTransporter: nodemailer.Transporter | null = null;

const getGmailTransporter = (): nodemailer.Transporter => {
  if (gmailTransporter) return gmailTransporter;
  gmailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  logger.info({ user: env.SMTP_USER }, '[email] Gmail SMTP transporter ready');
  return gmailTransporter;
};

// Ethereal fallback for when no email service is configured
let etherealTransporter: nodemailer.Transporter | null = null;

const getEtherealTransporter = async (): Promise<nodemailer.Transporter> => {
  if (etherealTransporter) return etherealTransporter;
  const testAccount = await nodemailer.createTestAccount();
  etherealTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  logger.info({ account: testAccount.user }, '[email] Ethereal test account created (fallback mode)');
  return etherealTransporter;
};

export const sendEmail = async (to: string, subject: string, htmlBody: string): Promise<void> => {
  try {
    if (USE_SENDGRID) {
      await sgMail.send({ to, from: env.EMAIL_FROM, subject, html: htmlBody });
      logger.info({ to, subject }, '[email] Sent via SendGrid');

    } else if (USE_GMAIL) {
      const transporter = getGmailTransporter();
      await transporter.sendMail({ from: `"DotZero CR Portal" <${env.SMTP_USER}>`, to, subject, html: htmlBody });
      logger.info({ to, subject }, '[email] Sent via Gmail SMTP');
      console.log(`\n📧 EMAIL SENT (Gmail)\n   To: ${to}\n   Subject: ${subject}\n`);

    } else {
      // No email service configured — use Ethereal and print preview URL
      const transporter = await getEtherealTransporter();
      const info = await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html: htmlBody });
      const previewUrl = nodemailer.getTestMessageUrl(info);
      logger.info({ to, subject, previewUrl }, '[email] Sent via Ethereal (dev fallback)');
      console.log('\n📧 EMAIL SENT (Ethereal dev preview)');
      console.log(`   To:      ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Preview: ${previewUrl}`);
      console.log('');
    }
  } catch (err) {
    logger.error({ err, to, subject }, '[email] Failed to send email');
    // Do not re-throw — email failures must not block the main operation
  }
};
