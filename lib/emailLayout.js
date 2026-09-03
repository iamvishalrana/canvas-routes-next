// Shared email design system — every Canvas Routes email composes from these
// helpers so they share one type scale, spacing rhythm, and component set.
// Direction (chosen 2026-08): modern single sans-serif (no serif anywhere),
// "refined signature" — keep the dark-green masthead identity, modernized with
// more whitespace, a bigger headline, calmer accents, and a soft rounded
// container floating on cream. Text content is passed in by each template and
// is never editorialized here.

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://canvasroutes.com'

// One font, everywhere. System-native sans renders crisp on iOS/Apple Mail
// (most of our audience) and degrades cleanly to Helvetica/Arial elsewhere.
export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Helvetica,Arial,sans-serif"

// Palette — kept deliberately small so accents stay subtle.
export const COLOR = {
  ink:   '#0F1E14', // dark green — masthead, footer, primary buttons
  gold:  '#C5A882', // accent — used sparingly (eyebrows, hairlines, card edge)
  cream: '#F5F1EC', // page background, soft cards
  taupe: '#EDE8E1', // alternate card background
  white: '#FFFFFF',
  head:  '#161616', // headings / strong text on light
  body:  '#4A4A4A', // body copy
  muted: '#8C8C8C', // secondary copy
  faint: '#B4B4B4', // tertiary / fine print
  line:  'rgba(0,0,0,0.07)',
}

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// ── Building blocks (return HTML strings) ─────────────────────────────────

// Tiny spaced-caps label. Gold by default; pass color for on-light use.
export function eyebrow(text, { color = COLOR.gold, mb = '14px' } = {}) {
  return `<p style="margin:0 0 ${mb};font-family:${FONT};font-size:11px;line-height:1;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${color};">${text}</p>`
}

// Body paragraph. `tone`: 'default' | 'muted' | 'fine'.
export function p(html, { tone = 'default', mb = '18px' } = {}) {
  const c = tone === 'fine' ? COLOR.faint : tone === 'muted' ? COLOR.muted : COLOR.body
  const size = tone === 'fine' ? '12px' : tone === 'muted' ? '14px' : '15px'
  const lh = tone === 'fine' ? '1.65' : '1.75'
  return `<p style="margin:0 0 ${mb};font-family:${FONT};font-size:${size};line-height:${lh};color:${c};">${html}</p>`
}

// Section heading inside the white body (e.g. a mid-email H2).
export function h2(text, { mb = '14px' } = {}) {
  return `<p style="margin:0 0 ${mb};font-family:${FONT};font-size:19px;line-height:1.3;font-weight:600;letter-spacing:-0.01em;color:${COLOR.head};">${text}</p>`
}

// Bulletproof button. variant: 'solid' (dark) | 'gold' | 'outline'.
export function button(href, label, { variant = 'solid', mb = '28px' } = {}) {
  const styles = {
    solid:   { bg: COLOR.ink,  fg: COLOR.cream, border: 'none' },
    green:   { bg: '#45643C',  fg: COLOR.cream, border: 'none' },
    gold:    { bg: COLOR.gold, fg: COLOR.ink,   border: 'none' },
    outline: { bg: 'transparent', fg: '#555', border: `1px solid rgba(0,0,0,0.18)` },
  }[variant]
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 ${mb};"><tr>
    <td style="border-radius:7px;background:${styles.bg};${styles.border !== 'none' ? `border:${styles.border};` : ''}">
      <a href="${href}" style="display:inline-block;padding:15px 32px;font-family:${FONT};font-size:11px;line-height:1;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${styles.fg};text-decoration:none;border-radius:7px;">${label}</a>
    </td></tr></table>`
}

// Accent note — soft cream panel with a gold left edge. `inner` is raw HTML.
export function accentCard(inner, { bg = COLOR.cream, mb = '26px' } = {}) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${bg};border-radius:0 10px 10px 0;margin:0 0 ${mb};">
    <tr><td style="border-left:3px solid ${COLOR.gold};border-radius:0 10px 10px 0;padding:20px 24px;">${inner}</td></tr></table>`
}

// Key/value detail card. rows: [[label, valueHtml], ...] — falsy rows dropped.
export function infoCard(rows, { title = '', mb = '28px' } = {}) {
  const items = rows.filter(Boolean).map(([label, value], i) => `
    <tr><td style="padding:${i === 0 ? '0' : '14px'} 0 0;">
      ${i === 0 ? '' : `<div style="height:1px;background:${COLOR.line};margin-bottom:14px;line-height:1px;font-size:1px;">&nbsp;</div>`}
      <div style="font-family:${FONT};font-size:10px;line-height:1;letter-spacing:0.16em;text-transform:uppercase;color:${COLOR.gold};margin-bottom:6px;">${label}</div>
      <div style="font-family:${FONT};font-size:15px;line-height:1.4;color:${COLOR.head};">${value}</div>
    </td></tr>`).join('')
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLOR.cream};border-radius:12px;margin:0 0 ${mb};">
    <tr><td style="padding:22px 24px;">
      ${title ? `<div style="font-family:${FONT};font-size:10px;line-height:1;letter-spacing:0.16em;text-transform:uppercase;color:${COLOR.gold};margin-bottom:16px;">${title}</div>` : ''}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${items}</table>
    </td></tr></table>`
}

// Numbered steps ("what happens next"). steps: [[title, bodyHtml], ...].
export function steps(stepList, { mb = '26px' } = {}) {
  const rows = stepList.map(([title, body], i) => `
    <tr><td style="padding-bottom:${i === stepList.length - 1 ? '0' : '18px'};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="30" style="width:30px;vertical-align:top;">
          <div style="width:24px;height:24px;background:${COLOR.ink};border-radius:50%;font-family:${FONT};font-size:11px;font-weight:600;color:${COLOR.gold};text-align:center;line-height:24px;">${i + 1}</div>
        </td>
        <td style="vertical-align:top;padding-left:14px;">
          <div style="font-family:${FONT};font-size:14px;font-weight:600;color:${COLOR.head};margin-bottom:3px;">${title}</div>
          <div style="font-family:${FONT};font-size:13px;line-height:1.6;color:${COLOR.muted};">${body}</div>
        </td>
      </tr></table>
    </td></tr>`).join('')
  return accentCard(`<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>`, { mb, bg: COLOR.cream })
}

// Follow strip — subtle outline link. Own row so it sits apart from CTAs.
export function instagram({ mb = '0' } = {}) {
  return button('https://www.instagram.com/canvasroutes', 'Follow @canvasroutes &rarr;', { variant: 'outline', mb })
}

// Thin hairline divider.
export function divider({ my = '26px' } = {}) {
  return `<div style="height:1px;background:${COLOR.line};margin:${my} 0;line-height:1px;font-size:1px;">&nbsp;</div>`
}

// Big centered verification code — for OTP-style emails (admin two-factor,
// gallery access codes, etc.). Deliberately its own component rather than a
// tuned accentCard: the code needs to read instantly at arm's length, so it
// gets far more size/weight/spacing than any other number in this system.
export function codeBox(code, { label = 'Verification Code', mb = '28px' } = {}) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLOR.cream};border-radius:14px;margin:0 0 ${mb};">
    <tr><td align="center" style="padding:26px 24px;">
      <div style="font-family:${FONT};font-size:10px;line-height:1;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${COLOR.gold};margin-bottom:14px;">${label}</div>
      <div style="font-family:${FONT};font-size:38px;line-height:1;font-weight:700;letter-spacing:0.26em;color:${COLOR.ink};">${esc(code)}</div>
    </td></tr></table>`
}

// ── Shell ─────────────────────────────────────────────────────────────────
// Composes: soft cream page → rounded container [ dark masthead · optional
// photo · white body · dark footer ]. `body` is HTML built from the helpers
// above. `footer` defaults to the standard one-line footer.
export function emailShell({
  title = 'Canvas Routes',
  preheader = '',
  eyebrow: eb = 'Canvas Routes',
  heading = '',
  body = '',
  footer = defaultFooter(),
  photoUrl = '',
  heroPhotoUrl = '',
} = {}) {
  // Optional event photo behind the masthead itself (not the separate
  // full-width `photoUrl` row below it) — layered as a flat dark tint via
  // linear-gradient(sameColor, sameColor) over the image, the standard
  // trick for a background-image + overlay in email HTML (a real
  // absolutely-positioned overlay element isn't reliable across clients).
  // Matches the rgba(10,20,12,0.72) tint the /meet/[id] registration page's
  // own hero uses. CSS background-image alone is silently stripped by a
  // number of real clients (notably Gmail in several contexts) — the
  // legacy HTML `background=""` attribute is the well-supported fallback
  // that actually makes the photo render there; it ignores background-size,
  // so it won't crop to "cover" the way the CSS does, but that only matters
  // in clients that support both anyway. Falls back to the flat COLOR.ink
  // background wherever background images are stripped entirely (Outlook
  // desktop) or no photo is given.
  const mastheadBgAttr = heroPhotoUrl ? ` background="${heroPhotoUrl}"` : ''
  const mastheadStyle = heroPhotoUrl
    ? `background-color:${COLOR.ink};background-image:linear-gradient(rgba(8,16,10,0.72),rgba(8,16,10,0.72)),url('${heroPhotoUrl}');background-size:cover;background-position:center;background-repeat:no-repeat;`
    : `background:${COLOR.ink};`
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.cream};-webkit-font-smoothing:antialiased;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLOR.cream};">
  <tr><td align="center" style="padding:36px 16px 52px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">

      <!-- Masthead -->
      <tr><td${mastheadBgAttr} style="${mastheadStyle}padding:44px 44px 40px;border-radius:16px 16px 0 0;">
        <img src="${SITE}/white-outline.png" alt="Canvas Routes" width="146" style="display:block;width:146px;height:auto;border:0;margin-bottom:30px;opacity:0.95;" />
        <div style="width:30px;height:1px;background:${COLOR.gold};margin-bottom:22px;line-height:1px;font-size:1px;">&nbsp;</div>
        ${eb ? eyebrow(eb, { color: COLOR.gold, mb: '12px' }) : ''}
        <h1 style="margin:0;font-family:${FONT};font-size:32px;line-height:1.16;font-weight:600;letter-spacing:-0.02em;color:${COLOR.cream};">${heading}</h1>
      </td></tr>

      ${photoUrl ? `<tr><td style="background:${COLOR.ink};line-height:0;"><img src="${photoUrl}" alt="" width="600" style="display:block;width:100%;height:auto;border:0;" /></td></tr>` : ''}

      <!-- Body -->
      <tr><td style="background:${COLOR.white};padding:38px 44px 36px;">
        ${body}
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:${COLOR.ink};padding:24px 44px;border-radius:0 0 16px 16px;">
        ${footer}
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

export function defaultFooter(html = '') {
  return `<p style="margin:0;font-family:${FONT};font-size:11px;line-height:1.6;color:rgba(245,241,236,0.42);">
    ${html || `&copy; 2026 Canvas Routes &middot; Montreal, QC`} &nbsp;&middot;&nbsp;
    <a href="${SITE}" style="color:rgba(197,168,130,0.55);text-decoration:none;">canvasroutes.com</a>
  </p>`
}

export { esc as escapeEmail, SITE as EMAIL_SITE }
