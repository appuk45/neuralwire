import { Resend } from 'resend';
import type { SummarizedArticle } from '../types.js';

export interface DigestMeta { date: string; webAppUrl: string; accessToken: string; }

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function renderDigestHtml(articles: SummarizedArticle[], meta: DigestMeta): string {
  const items = articles.map((a) => `
    <div style="margin:0 0 20px;padding-bottom:16px;border-bottom:1px solid #e5e7eb;">
      <a href="${escapeHtml(a.sourceUrl)}" style="color:#111827;text-decoration:none;font-size:17px;font-weight:600;">
        ${escapeHtml(a.headline)}
      </a>
      <p style="margin:6px 0;color:#4b5563;font-size:14px;line-height:1.5;">${escapeHtml(a.summary)}</p>
      <span style="color:#6b7280;font-size:12px;">${escapeHtml(a.categories.join(' · '))} · ${escapeHtml(a.source)}</span>
    </div>`).join('');

  const viewAll = `${meta.webAppUrl}/?key=${encodeURIComponent(meta.accessToken)}`;
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f9fafb;padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;">
      <h1 style="font-size:20px;margin:0 0 4px;">🤖 AI Digest</h1>
      <p style="color:#6b7280;margin:0 0 24px;font-size:13px;">${escapeHtml(meta.date)} · ${articles.length} stories</p>
      ${items}
      <a href="${escapeHtml(viewAll)}" style="display:inline-block;margin-top:8px;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">View all news →</a>
    </div>
  </body></html>`;
}

export async function sendDigest(
  html: string, subject: string, to: string, apiKey: string,
): Promise<string | null> {
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({ from: 'NeuralWire <digest@neuralwire.app>', to, subject, html });
  if (result.error) throw new Error(`Resend error: ${JSON.stringify(result.error)}`);
  return result.data?.id ?? null;
}
