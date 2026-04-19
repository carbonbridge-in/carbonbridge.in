import { supabaseAdmin } from './supabase';

// ─── Carbon Calculation Engine ──────────────────────────────
export const GRID_EMISSION_FACTOR = 0.82; // tCO2e/MWh — CEA India combined margin
export const CREDIT_PRICE_INR = 300;      // ₹/tCO2e — conservative estimate

export function calcCER(mwh: number, ef = GRID_EMISSION_FACTOR) {
  return +(mwh * ef).toFixed(3);
}

export function calcRevenue(cer: number, priceInr = CREDIT_PRICE_INR) {
  return +(cer * priceInr).toFixed(2);
}

// Max MWh a plant can generate in a month
export function calcMaxMWh(capacityMW: number, cuf = 0.19) {
  return +(capacityMW * 24 * 31 * cuf).toFixed(2);
}

// Project integrity hash (duplicate guard)
export function projectHash(company: string, lat: number, lon: number, mw: number) {
  const str = `${company.toLowerCase().trim()}|${lat}|${lon}|${mw}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(16).padStart(16, '0');
}

// ─── Audit Log ──────────────────────────────────────────────
export async function writeAuditLog({
  userId, userEmail, action, entityType, entityId, oldValue, newValue, ipAddress,
}: {
  userId?: string;
  userEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: object;
  newValue?: object;
  ipAddress?: string;
}) {
  await supabaseAdmin.from('audit_logs').insert({
    user_id: userId,
    user_email: userEmail,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_value: oldValue,
    new_value: newValue,
    ip_address: ipAddress,
  });
}

// ─── Notifications ──────────────────────────────────────────
export async function createNotification({
  userId, type, title, message, entityType, entityId,
}: {
  userId: string;
  type: string;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
}) {
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    entity_type: entityType,
    entity_id: entityId,
  });
}

// ─── Send Email (nodemailer) ─────────────────────────────────
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'CarbonBridge <noreply@carbonbridge.in>',
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error('[Email Error]', e);
  }
}

export function emailNewUser(name: string, email: string, tempPass: string) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="width:48px;height:48px;background:#0B3D2E;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;">
          <span style="color:#3FAE5A;font-size:22px;">🌿</span>
        </div>
        <h1 style="color:#0B3D2E;font-size:22px;font-weight:700;margin-top:12px;">CarbonBridge</h1>
      </div>
      <div style="background:#fff;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
        <h2 style="color:#0B3D2E;font-size:18px;margin-bottom:8px;">Welcome, ${name}!</h2>
        <p style="color:#6b7280;margin-bottom:20px;">Your CarbonBridge account has been created. Use the credentials below to sign in.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:4px 0;font-size:14px;"><strong>Email:</strong> ${email}</p>
          <p style="margin:4px 0;font-size:14px;"><strong>Temporary Password:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;">${tempPass}</code></p>
        </div>
        <p style="color:#6b7280;font-size:13px;">⚠️ You will be asked to change this password on first login.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display:block;background:#0B3D2E;color:#fff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:20px;">Login to CarbonBridge →</a>
      </div>
    </div>`;
}

export function emailSubmissionNotification(projectName: string, month: string, year: number, mwh: number) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
      <h2 style="color:#0B3D2E;">New Generation Data Submitted</h2>
      <p>A client has submitted monthly generation data requiring your review:</p>
      <ul>
        <li><strong>Project:</strong> ${projectName}</li>
        <li><strong>Period:</strong> ${month} ${year}</li>
        <li><strong>MWh Generated:</strong> ${mwh.toLocaleString('en-IN')} MWh</li>
      </ul>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/submissions" style="background:#0B3D2E;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Review Submission →</a>
    </div>`;
}

export function emailApprovalNotification(projectName: string, month: string, year: number, approved: boolean, comment?: string) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;">
      <h2 style="color:${approved ? '#0B3D2E' : '#dc2626'};">Submission ${approved ? 'Approved ✅' : 'Rejected ❌'}</h2>
      <p>Your generation data submission has been reviewed:</p>
      <ul>
        <li><strong>Project:</strong> ${projectName}</li>
        <li><strong>Period:</strong> ${month} ${year}</li>
        <li><strong>Decision:</strong> ${approved ? 'Approved — data is now part of your verified MRV record' : 'Rejected'}</li>
        ${comment ? `<li><strong>Comment:</strong> ${comment}</li>` : ''}
      </ul>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background:#0B3D2E;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">View Dashboard →</a>
    </div>`;
}
