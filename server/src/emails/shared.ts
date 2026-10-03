/**
 * Shared email primitives. Every template builds on `layout` + `escapeHtml`
 * so no template can forget escaping or invent its own shell.
 */
export interface RenderedEmail {
  subject: string;
  html: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function money(amount: number, currency: string): string {
  return `${escapeHtml(currency)} ${(amount / 100).toFixed(2)}`;
}

export function layout(title: string, greeting: string, body: string, footer: string): string {
  return `<!doctype html>
<html>
  <body style="font-family: sans-serif; background: #f8f7f3; padding: 24px;">
    <div style="max-width: 520px; margin: auto; background: #ffffff; border-radius: 16px; padding: 32px;">
      <h1 style="font-size: 22px; color: #000000;">${title}</h1>
      <p style="color: #2f2f2f;">Hi ${greeting},</p>
      ${body}
      <p style="color: #696969; font-size: 12px;">${footer}</p>
    </div>
  </body>
</html>`;
}
