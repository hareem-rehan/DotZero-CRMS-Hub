import { env } from '../config/env';

const BASE_URL = env.CLIENT_URL;

const layout = (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F0E8;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F0E8;padding:30px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr><td style="background:#EF323F;padding:24px 32px">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#fff;border-radius:4px;padding:6px 8px;display:inline-block">
              <span style="color:#EF323F;font-weight:900;font-size:16px;letter-spacing:-0.5px">DotZero</span>
            </td>
            <td style="color:#fff;font-size:13px;padding-left:12px;opacity:0.9">CR Portal</td>
          </tr></table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 32px;background:#F7F7F7;border-top:1px solid #E5E5E5">
          <p style="margin:0;font-size:11px;color:#5D5B5B;text-align:center">
            DotZero CR Portal · This is an automated notification · Do not reply to this email
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const btn = (text: string, url: string) =>
  `<div style="text-align:center;margin:24px 0">
    <a href="${url}" style="background:#EF323F;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block">${text}</a>
  </div>`;

const crMeta = (crNumber: string, projectName: string) =>
  `<div style="background:#F7F7F7;border-radius:6px;padding:12px 16px;margin:16px 0;font-size:13px">
    <span style="color:#5D5B5B">CR Number: </span><strong style="font-family:monospace">${crNumber}</strong>&nbsp;&nbsp;
    <span style="color:#5D5B5B">Project: </span><strong>${projectName}</strong>
  </div>`;

// ─── Templates ────────────────────────────────────────────────────────────────

export const welcomeEmail = (name: string, setupUrl: string) => ({
  subject: 'Welcome to DotZero CR Portal — Set up your password',
  html: layout(`
    <h2 style="margin:0 0 8px;color:#2D2D2D">Welcome, ${name}!</h2>
    <p style="color:#5D5B5B;font-size:14px">Your account has been created on the DotZero CR Portal. Click below to set your password and get started.</p>
    <p style="color:#5D5B5B;font-size:13px">This link expires in <strong>48 hours</strong>.</p>
    ${btn('Set Up Password', setupUrl)}
    <p style="font-size:12px;color:#5D5B5B;text-align:center">If you didn't expect this email, you can safely ignore it.</p>
  `),
});

export const inviteEmail = (email: string, registerUrl: string, projectName: string) => ({
  subject: `You've been invited to DotZero CR Portal — Set up your account`,
  html: layout(`
    <h2 style="margin:0 0 8px;color:#2D2D2D">You've been invited!</h2>
    <p style="color:#5D5B5B;font-size:14px">You have been added as a <strong>Product Owner</strong> on project <strong>${projectName}</strong> in the DotZero CR Portal.</p>
    <div style="background:#F7F7F7;border-radius:6px;padding:12px 16px;margin:16px 0;font-size:13px">
      <p style="margin:0 0 6px;color:#2D2D2D"><strong>What to do next:</strong></p>
      <ol style="margin:0;padding-left:18px;color:#5D5B5B;line-height:1.8">
        <li>Click the button below to set up your account</li>
        <li>Enter your name and choose a password</li>
        <li>Log in and start submitting change requests</li>
      </ol>
    </div>
    <p style="color:#EF323F;font-size:13px;text-align:center">⏳ This link expires in <strong>72 hours</strong> and is single-use.</p>
    ${btn('Set Up My Account & Password', registerUrl)}
    <p style="font-size:12px;color:#5D5B5B;text-align:center">Invited email: ${email}</p>
  `),
});

export const crSubmittedEmail = (
  dmName: string,
  crNumber: string,
  projectName: string,
  crId: string,
) => ({
  subject: `New CR Pending Estimation — ${crNumber}`,
  html: layout(`
    <h2 style="margin:0 0 8px;color:#2D2D2D">New Change Request Submitted</h2>
    <p style="color:#5D5B5B;font-size:14px">Hi ${dmName}, a new change request has been submitted and requires your estimation.</p>
    ${crMeta(crNumber, projectName)}
    ${btn('Review & Estimate', `${BASE_URL}/dm/pending/${crId}`)}
  `),
});

export const estimationReturnedEmail = (
  poName: string,
  crNumber: string,
  projectName: string,
  crId: string,
  estimatedHours: number,
) => ({
  subject: `Estimation Ready — ${crNumber}`,
  html: layout(`
    <h2 style="margin:0 0 8px;color:#2D2D2D">Your CR Has Been Estimated</h2>
    <p style="color:#5D5B5B;font-size:14px">Hi ${poName}, the DM has completed their estimation for your change request.</p>
    ${crMeta(crNumber, projectName)}
    <p style="color:#5D5B5B;font-size:14px">Estimated hours: <strong>${estimatedHours}h</strong></p>
    <p style="color:#5D5B5B;font-size:14px">Please review and take action: <strong>Approve</strong>, <strong>Decline</strong>, or <strong>Resubmit</strong>.</p>
    ${btn('Review Estimation', `${BASE_URL}/client/my-crs/${crId}`)}
  `),
});

export const crApprovedEmail = (
  dmName: string,
  crNumber: string,
  projectName: string,
  approvalNotes?: string,
) => ({
  subject: `CR Approved — ${crNumber}`,
  html: layout(`
    <h2 style="margin:0 0 8px;color:#2D2D2D">Change Request Approved</h2>
    <p style="color:#5D5B5B;font-size:14px">Hi ${dmName}, the following change request has been approved by the client.</p>
    ${crMeta(crNumber, projectName)}
    ${approvalNotes ? `<p style="color:#5D5B5B;font-size:14px"><em>Notes: ${approvalNotes}</em></p>` : ''}
    <p style="color:#5D5B5B;font-size:14px">No further action is required from you at this time.</p>
  `),
});

export const crDeclinedEmail = (
  dmName: string,
  crNumber: string,
  projectName: string,
  reason: string,
) => ({
  subject: `CR Declined — ${crNumber}`,
  html: layout(`
    <h2 style="margin:0 0 8px;color:#2D2D2D">Change Request Declined</h2>
    <p style="color:#5D5B5B;font-size:14px">Hi ${dmName}, the following change request has been declined by the client.</p>
    ${crMeta(crNumber, projectName)}
    <div style="background:#FFF5F5;border-left:3px solid #EF323F;padding:12px 16px;margin:16px 0;font-size:13px">
      <strong style="color:#EF323F">Reason:</strong><br>
      <span style="color:#2D2D2D">${reason}</span>
    </div>
  `),
});

export const crResubmittedEmail = (
  dmName: string,
  crNumber: string,
  projectName: string,
  version: number,
  crId: string,
) => ({
  subject: `CR Resubmitted (v${version}) — ${crNumber}`,
  html: layout(`
    <h2 style="margin:0 0 8px;color:#2D2D2D">Change Request Resubmitted</h2>
    <p style="color:#5D5B5B;font-size:14px">Hi ${dmName}, the client has revised and resubmitted the following change request.</p>
    ${crMeta(crNumber, projectName)}
    <p style="color:#5D5B5B;font-size:14px">This is now <strong>version ${version}</strong>. Please review the changes and provide a new estimation.</p>
    ${btn('Review Resubmission', `${BASE_URL}/dm/pending/${crId}`)}
  `),
});

export const statusChangedEmail = (
  userName: string,
  crNumber: string,
  projectName: string,
  newStatus: string,
  crId: string,
  role: string,
) => ({
  subject: `CR ${crNumber} — Status Updated to ${newStatus.replace('_', ' ')}`,
  html: layout(`
    <h2 style="margin:0 0 8px;color:#2D2D2D">Change Request Status Updated</h2>
    <p style="color:#5D5B5B;font-size:14px">Hi ${userName},</p>
    ${crMeta(crNumber, projectName)}
    <p style="color:#5D5B5B;font-size:14px">Status has been updated to: <strong>${newStatus.replace('_', ' ')}</strong></p>
    ${btn('View Change Request', `${BASE_URL}/${role === 'PRODUCT_OWNER' ? 'client/my-crs' : 'dm/all-crs'}/${crId}`)}
  `),
});

export const reminderEmail = (
  dmName: string,
  crNumber: string,
  projectName: string,
  hoursStuck: number,
  crId: string,
) => ({
  subject: `Reminder: CR ${crNumber} awaiting estimation for ${hoursStuck}h`,
  html: layout(`
    <h2 style="margin:0 0 8px;color:#2D2D2D">Estimation Reminder</h2>
    <p style="color:#5D5B5B;font-size:14px">Hi ${dmName}, this is a friendly reminder that the following change request has been waiting for your estimation.</p>
    ${crMeta(crNumber, projectName)}
    <div style="background:#FFF9E6;border-left:3px solid #F59E0B;padding:12px 16px;margin:16px 0;font-size:13px">
      <strong style="color:#F59E0B">⏰ Waiting for ${hoursStuck} hours</strong>
    </div>
    ${btn('Estimate Now', `${BASE_URL}/dm/pending/${crId}`)}
  `),
});

export const dmAssignedEmail = (dmName: string, projectName: string, portalUrl: string) => ({
  subject: `You've been assigned to project — ${projectName}`,
  html: layout(`
    <h2 style="margin:0 0 8px;color:#2D2D2D">Project Assignment</h2>
    <p style="color:#5D5B5B;font-size:14px">Hi ${dmName}, you have been assigned as the Delivery Manager for project <strong>${projectName}</strong>.</p>
    <p style="color:#5D5B5B;font-size:14px">Log in to your portal to view the project's pending change requests.</p>
    ${btn('Go to DM Portal', portalUrl)}
  `),
});

export const projectAssignedEmail = (
  poName: string,
  projectName: string,
  newCrUrl: string,
) => ({
  subject: `New project assigned — ${projectName}`,
  html: layout(`
    <h2 style="margin:0 0 8px;color:#2D2D2D">New Project Assigned</h2>
    <p style="color:#5D5B5B;font-size:14px">Hi ${poName}, a new project has been assigned to you on the DotZero CR Portal.</p>
    <div style="background:#F7F7F7;border-radius:6px;padding:12px 16px;margin:16px 0;font-size:13px">
      <span style="color:#5D5B5B">Project: </span><strong>${projectName}</strong>
    </div>
    <p style="color:#5D5B5B;font-size:14px">You can now submit change requests for this project directly from your portal.</p>
    ${btn('Create a Change Request', newCrUrl)}
    <p style="font-size:12px;color:#5D5B5B;text-align:center">If you have any questions, please reach out to your Delivery Manager.</p>
  `),
});

export const passwordResetEmail = (name: string, resetUrl: string) => ({
  subject: 'Reset Your DotZero Password',
  html: layout(`
    <h2 style="margin:0 0 8px;color:#2D2D2D">Password Reset Request</h2>
    <p style="color:#5D5B5B;font-size:14px">Hi ${name ?? 'there'}, we received a request to reset your password.</p>
    <p style="color:#5D5B5B;font-size:13px">This link expires in <strong>1 hour</strong> and is single-use.</p>
    ${btn('Reset Password', resetUrl)}
    <p style="font-size:12px;color:#5D5B5B;text-align:center">If you didn't request this, you can safely ignore this email.</p>
  `),
});
