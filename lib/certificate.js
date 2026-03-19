// ============================================================
// CERTIFICATE — Feyn  (complete redesign)
//
// Philosophy: this is a page from a beautiful textbook.
// Not a badge. Not a UI card. A document.
//
// The design pulls directly from the site's DNA:
//   · Warm off-white (#faf8f4) — the site's --bg in light mode
//   · Gold (#8b5e1a / #c8a96e) — used once, meaningfully
//   · Libre Baskerville (→ Times) — for the name and course
//   · DM Sans (→ Helvetica) — for all supporting text
//   · JetBrains Mono (→ Courier) — for IDs and labels
//   · A single 2px gold rule at the top (the site's .hero__rule)
//   · Brain glyph drawn in SVG paths — the actual Feyn logo
//   · No borders around sections. No rounded boxes. No shadows.
//   · Whitespace does all the work.
//
// Layout (portrait rhythm applied to landscape canvas):
//   · Top: Feyn logo lockup (brain + wordmark), centered
//   · Rule: 2px gold, 32mm wide
//   · Certificate of Completion — mono eyebrow
//   · ——— generous whitespace ———
//   · "presented to"  (muted, small)
//   · RECIPIENT NAME  (36pt serif italic — the dominant element)
//   · "for completing" (muted)
//   · COURSE NAME (14pt serif bold, gold)
//   · Programme · Date  (mono, muted, inline)
//   · ——— generous whitespace ———
//   · Footer ruled line
//   · Three columns: signature | cert ID | QR
//
// QR URL encodes embedded cert data so it verifies on any
// device even without Supabase configured.
// ============================================================

const SITE_URL = 'https://feyn.netlify.app'

// ── Light palette — exact globals.css light-mode values ──────────────
const P = {
  bg:         [250, 248, 244],  // #faf8f4
  bg2:        [243, 240, 234],  // #f3f0ea
  border:     [216, 210, 196],  // #d8d2c4
  text:       [26,  23,  19 ],  // #1a1713
  text2:      [90,  82,  72 ],  // #5a5248
  text3:      [154, 144, 128],  // #9a9080
  accent:     [139, 94,  26 ],  // #8b5e1a  deep gold
  accent2:    [200, 169, 110],  // #c8a96e  light gold
}

// ── QR: embed cert data in URL so it works without Supabase ──────────
function makeCertPayload(cert) {
  try {
    const data = {
      id:          cert.id,
      userName:    cert.userName,
      subjectName: cert.subjectName,
      programName: cert.programName,
      issuedAt:    cert.issuedAt,
    }
    return btoa(JSON.stringify(data))
  } catch (_) { return '' }
}

async function makeQR(text) {
  try {
    const QRCode = (await import('qrcode')).default
    return await QRCode.toDataURL(text, {
      width: 200,
      margin: 1,
      color: { dark: '#1a1713', light: '#faf8f4' },
      errorCorrectionLevel: 'H',
    })
  } catch (_) { return null }
}

// ── Thin rule helper ──────────────────────────────────────────────────
function rule(doc, x1, x2, y, rgb, lw = 0.25) {
  doc.setDrawColor(...rgb)
  doc.setLineWidth(lw)
  doc.line(x1, y, x2, y)
}

export async function downloadCertificate({ cert, coachName, coachSignatureUrl }) {
  const { jsPDF } = await import('jspdf')

  const W  = 297
  const H  = 210
  const cx = W / 2
  const M  = 16   // safe margin

  // Build QR URL with embedded cert data (works offline / no Supabase)
  const payload    = makeCertPayload(cert)
  const verifyUrl  = `${SITE_URL}/verify/?id=${cert.id}${payload ? '&d=' + payload : ''}`
  const qrDataUrl  = await makeQR(verifyUrl)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ── Background ───────────────────────────────────────────────────
  doc.setFillColor(...P.bg)
  doc.rect(0, 0, W, H, 'F')

  // ── Single outer border — hairline, warm grey ─────────────────────
  // Not gold. The site uses a simple border. Gold is reserved for
  // the accent rule — one moment of color.
  doc.setDrawColor(...P.border)
  doc.setLineWidth(0.3)
  doc.rect(M, M, W - M * 2, H - M * 2)

  // ════════════════════════════════════════════════════
  // LOGO BLOCK — brain icon (SVG paths) + "Feyn" wordmark
  // Positioned: centered, near top
  // The brain is drawn as simplified SVG-style bezier paths
  // via jsPDF's lines API. Keeps the actual Feyn branding.
  // ════════════════════════════════════════════════════
  const logoY = M + 14
  const brainX = cx - 22   // brain glyph left edge
  const brainY = logoY - 5 // brain glyph top

  // Draw brain glyph using jsPDF path commands
  // Simplified 2-hemisphere brain icon matching ri-brain-line style
  // Drawn at ~8×6mm
  const bx = brainX
  const by = brainY
  const bs = 7.5  // scale unit

  doc.setDrawColor(...P.accent)
  doc.setLineWidth(0.45)
  doc.setFillColor(...P.bg)  // no fill — outline only

  // Left hemisphere (mirrored pair of arcs)
  // Outer left lobe
  doc.lines(
    [[0.4*bs, -0.7*bs, 0.9*bs, -1*bs, 1.1*bs, -0.8*bs],
     [0.2*bs,  0.1*bs, 0.4*bs,  0.4*bs, 0*bs,  0.6*bs],
     [-0.3*bs, 0.1*bs,-0.5*bs, -0.1*bs,-0.5*bs, 0*bs ],
     [-0.3*bs,-0.5*bs,-0.8*bs, -0.5*bs,-1.1*bs, 0*bs ]],
    bx + 1.1*bs, by + 0.8*bs,
    [1, 1], 'S', false
  )
  // Right hemisphere
  doc.lines(
    [[-0.4*bs, -0.7*bs, -0.9*bs, -1*bs, -1.1*bs, -0.8*bs],
     [-0.2*bs,  0.1*bs, -0.4*bs,  0.4*bs, 0*bs,   0.6*bs],
     [ 0.3*bs,  0.1*bs,  0.5*bs, -0.1*bs, 0.5*bs,  0*bs ],
     [ 0.3*bs, -0.5*bs,  0.8*bs, -0.5*bs, 1.1*bs,  0*bs ]],
    bx + 1.1*bs, by + 0.8*bs,
    [1, 1], 'S', false
  )
  // Center fold line (corpus callosum hint)
  doc.setLineWidth(0.25)
  doc.setDrawColor(...P.accent2)
  doc.line(bx + 1.1*bs, by + 0.2*bs, bx + 1.1*bs, by + 1.0*bs)

  // "Feyn" wordmark — serif, right of brain
  doc.setFont('times', 'italic')
  doc.setFontSize(15)
  doc.setTextColor(...P.text)
  doc.text('Feyn', brainX + 2.6*bs, logoY + 1.5)

  // ════════════════════════════════════════════════════
  // GOLD RULE — the site's .hero__rule
  // One 2px-tall gold bar, 32mm wide, centered.
  // This is the only accent element above the name.
  // ════════════════════════════════════════════════════
  const ruleY = logoY + 8
  doc.setFillColor(...P.accent)
  doc.rect(cx - 16, ruleY, 32, 0.8, 'F')

  // ════════════════════════════════════════════════════
  // EYEBROW — "CERTIFICATE OF COMPLETION"
  // Mono, uppercase, wide tracking. Muted. Small.
  // Exactly like .page-header__eyebrow on the site.
  // ════════════════════════════════════════════════════
  doc.setFont('courier', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...P.text3)
  doc.text('CERTIFICATE  OF  COMPLETION', cx, ruleY + 7, {
    align: 'center', charSpace: 1.6,
  })

  // ════════════════════════════════════════════════════
  // BODY — the semantic core
  // All centered. Generous vertical breathing room.
  // ════════════════════════════════════════════════════
  const bodyTop = ruleY + 20

  // "presented to"
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...P.text3)
  doc.text('presented to', cx, bodyTop, { align: 'center' })

  // RECIPIENT NAME — largest element, highest contrast
  const nameY = bodyTop + 15
  const name  = cert.userName || 'Student'
  doc.setFont('times', 'italic')
  doc.setFontSize(38)
  doc.setTextColor(...P.text)
  doc.text(name, cx, nameY, { align: 'center' })

  // Measure rendered name width for the underline
  const nameW = doc.getTextWidth(name)

  // Underline: same gold as the accent rule, weight-matched
  rule(doc, cx - nameW / 2, cx + nameW / 2, nameY + 2.5, P.accent2, 0.5)

  // "for completing"
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...P.text2)
  doc.text('for completing', cx, nameY + 12, { align: 'center' })

  // COURSE NAME — serif bold, gold. Second-strongest element.
  const courseY = nameY + 22
  doc.setFont('times', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...P.accent)
  doc.text(cert.subjectName || '', cx, courseY, { align: 'center' })

  // Programme + date — mono inline, muted
  // Site uses · as separator everywhere (breadcrumbs, meta rows)
  const metaDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const metaLine = `${cert.programName || ''}  ·  ${metaDate}`
  doc.setFont('courier', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...P.text3)
  doc.text(metaLine, cx, courseY + 8, { align: 'center', charSpace: 0.3 })

  // ════════════════════════════════════════════════════
  // FOOTER ZONE
  // Thin rule, then three columns in clean mono/serif type.
  // No boxes. No fills. Type on paper.
  // ════════════════════════════════════════════════════
  const footerY = H - M - 38

  // Footer rule — slightly heavier than border
  rule(doc, M + 4, W - M - 4, footerY, P.border, 0.4)

  // Column centres
  const col1 = M + 4 + (W - M * 2 - 8) * 0.18
  const col2 = cx
  const col3 = W - M - 4 - (W - M * 2 - 8) * 0.18

  const flY  = footerY + 8   // label row
  const fvY  = flY + 8       // value row
  const frY  = fvY + 3.5     // underline row

  // ── Column label helper ───────────────────────────────────────────
  function flabel(t, x, y) {
    doc.setFont('courier', 'normal')
    doc.setFontSize(5.2)
    doc.setTextColor(...P.text3)
    doc.text(t.toUpperCase(), x, y, { align: 'center', charSpace: 1.1 })
  }
  function funderline(x, y, half = 22) {
    rule(doc, x - half, x + half, y, P.border, 0.2)
  }

  // ── Col 1: Instructor / Signature ────────────────────────────────
  flabel('Instructor', col1, flY)

  if (coachSignatureUrl) {
    try {
      doc.addImage(coachSignatureUrl, 'PNG', col1 - 22, flY + 0.5, 44, 10)
      funderline(col1, flY + 12)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...P.text2)
      doc.text(coachName || 'Instructor', col1, flY + 17, { align: 'center' })
    } catch (_) {}
  } else {
    // Italic name as signature stand-in — exactly how the site renders
    // instructor names on subject cards
    doc.setFont('times', 'italic')
    doc.setFontSize(11)
    doc.setTextColor(...P.text2)
    doc.text(coachName || 'Instructor', col1, fvY + 2, { align: 'center' })
    funderline(col1, frY)
  }

  // ── Col 2: Certificate ID ─────────────────────────────────────────
  flabel('Certificate ID', col2, flY)

  doc.setFont('courier', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...P.text)
  doc.text(cert.id, col2, fvY + 2, { align: 'center' })
  funderline(col2, frY)

  // ── Col 3: QR code ────────────────────────────────────────────────
  flabel('Verify at feyn.netlify.app', col3, flY)

  if (qrDataUrl) {
    const qrS = 22
    doc.addImage(qrDataUrl, 'PNG', col3 - qrS / 2, flY + 0.5, qrS, qrS)
    doc.setFont('courier', 'normal')
    doc.setFontSize(4.8)
    doc.setTextColor(...P.text3)
    doc.text(cert.id, col3, flY + qrS + 3.5, { align: 'center' })
  } else {
    doc.setFont('courier', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...P.text3)
    doc.text('feyn.netlify.app/verify', col3, fvY + 2, { align: 'center' })
    funderline(col3, frY)
  }

  // ── Bottom colophon ───────────────────────────────────────────────
  // Very small, very muted — the site always has mono meta at bottom
  rule(doc, M + 4, W - M - 4, H - M - 5, P.border, 0.2)
  doc.setFont('courier', 'normal')
  doc.setFontSize(4.5)
  doc.setTextColor(...P.text3)
  doc.text(
    `${SITE_URL}/verify/?id=${cert.id}`,
    cx, H - M - 2,
    { align: 'center', charSpace: 0.2 }
  )

  // ── Save ──────────────────────────────────────────────────────────
  const slug = s => (s || '').replace(/\s+/g, '-')
  doc.save(`Feyn-Certificate-${slug(cert.subjectName)}-${slug(cert.userName)}.pdf`)
}
