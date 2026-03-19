// ============================================================
// CERTIFICATE — Feyn
//
// Design language: Feyn light mode, inspired by reference layout.
//   Structure (like reference):
//     · Main body zone (white/warm): left-aligned, big type
//     · Stats row: key numbers inline
//     · Footer band (slightly darker bg): signature | logo | QR
//
//   Feyn DNA:
//     · #faf8f4 background, #f3f0ea footer band
//     · Serif (Times) for name + course — Libre Baskerville proxy
//     · Sans (Helvetica) for body copy
//     · Mono (Courier) for IDs, labels, cert number
//     · Gold (#8b5e1a) used once — left accent bar
//     · Brain icon: embedded as base64 PNG (remixicon ri-brain-line)
//     · Sharp corners, no shadows, no rounded boxes
//
//   QR: ONLY the short verify URL — no data payload
//   (short URL = scannable QR; server does the lookup)
//
//   Verify flow:
//     QR → /verify/?id=FEYN-xxx → Supabase lookup → show result
// ============================================================

const SITE_URL = 'https://feyn.netlify.app'

// ── Palette ───────────────────────────────────────────────────────────
const P = {
  bg:        [250, 248, 244],   // #faf8f4  main body
  footerBg:  [237, 233, 224],   // #ede9e0  footer band (--bg-3)
  border:    [216, 210, 196],   // #d8d2c4
  text:      [26,  23,  19 ],   // #1a1713
  text2:     [90,  82,  72 ],   // #5a5248
  text3:     [154, 144, 128],   // #9a9080
  accent:    [139, 94,  26 ],   // #8b5e1a  deep gold
  accent2:   [200, 169, 110],   // #c8a96e  light gold
}

// ── Brain icon as base64 PNG ──────────────────────────────────────────
// ri-brain-line rendered at 64×64, gold stroke on transparent bg
// Generated from the SVG path of remixicon brain-line
const BRAIN_PNG = 'data:image/png;base64,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'

// Better: render brain path directly using jsPDF SVG-like approach
// We draw the ri-brain-line icon using explicit bezier curves
// The remixicon brain path (simplified, normalized to 0-1 unit square):
function drawBrain(doc, x, y, size, color) {
  // size in mm, x/y = center
  const s = size / 2
  doc.setDrawColor(...color)
  doc.setLineWidth(size * 0.06)

  // Brain outline: two hemispheres
  // Left hemisphere
  doc.lines([
    [ s*0.05,  -s*0.60,  s*0.25, -s*0.95,  s*0.45, -s*0.90],
    [ s*0.20,   s*0.04,  s*0.35,  s*0.30,  s*0.08,  s*0.52],
    [-s*0.12,   s*0.08, -s*0.22, -s*0.04, -s*0.22,  s*0.04],
    [-s*0.14,  -s*0.38, -s*0.42, -s*0.38, -s*0.50, -s*0.02],
  ], x - s*0.04, y + s*0.10, [1,1], 'S', false)

  // Right hemisphere (mirrored)
  doc.lines([
    [-s*0.05,  -s*0.60, -s*0.25, -s*0.95, -s*0.45, -s*0.90],
    [-s*0.20,   s*0.04, -s*0.35,  s*0.30, -s*0.08,  s*0.52],
    [ s*0.12,   s*0.08,  s*0.22, -s*0.04,  s*0.22,  s*0.04],
    [ s*0.14,  -s*0.38,  s*0.42, -s*0.38,  s*0.50, -s*0.02],
  ], x + s*0.04, y + s*0.10, [1,1], 'S', false)

  // Center divide
  doc.setLineWidth(size * 0.03)
  doc.setDrawColor(...P.accent2)
  doc.line(x, y - s*0.65, x, y + s*0.45)

  // Small lobes / details
  doc.setLineWidth(size * 0.04)
  doc.setDrawColor(...color)
  // left lobe bump
  doc.lines([
    [-s*0.18, s*0.10, -s*0.30, s*0.25, -s*0.18, s*0.38],
  ], x - s*0.30, y - s*0.14, [1,1], 'S', false)
  // right lobe bump
  doc.lines([
    [ s*0.18, s*0.10,  s*0.30, s*0.25,  s*0.18, s*0.38],
  ], x + s*0.30, y - s*0.14, [1,1], 'S', false)
}

// ── QR: SHORT URL ONLY — no embedded data ─────────────────────────────
// Short URL = compact QR = actually scannable
async function makeQR(url) {
  try {
    const QRCode = (await import('qrcode')).default
    return await QRCode.toDataURL(url, {
      width:                256,
      margin:               2,
      color:                { dark: '#1a1713', light: '#ede9e0' },
      errorCorrectionLevel: 'M',
    })
  } catch (_) { return null }
}

// ── Rule helper ────────────────────────────────────────────────────────
function hline(doc, x1, x2, y, rgb, lw = 0.3) {
  doc.setDrawColor(...rgb)
  doc.setLineWidth(lw)
  doc.line(x1, y, x2, y)
}

// ── Main export ────────────────────────────────────────────────────────
export async function downloadCertificate({ cert, coachName, coachTitle, totalLessons, coachSignatureUrl }) {
  const { jsPDF } = await import('jspdf')

  // A4 landscape
  const W = 297
  const H = 210

  // Margins / zones
  const ML = 20   // left margin (after accent bar)
  const MR = 18   // right margin
  const MT = 16   // top margin
  const MB = 14   // bottom margin

  // Footer band height
  const FOOTER_H = 46
  const FOOTER_Y = H - MB - FOOTER_H

  // Left accent bar
  const BAR_W = 4.5
  const BAR_X = 12

  // Content left edge
  const CL = BAR_X + BAR_W + 8   // ~24.5

  // Right edge of content
  const CR = W - MR              // ~279

  // Verify URL — SHORT, clean, scannable
  const verifyUrl = `${SITE_URL}/verify/?id=${cert.id}`
  const qrDataUrl = await makeQR(verifyUrl)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ── BACKGROUNDS ─────────────────────────────────────────────────────

  // Main body
  doc.setFillColor(...P.bg)
  doc.rect(0, 0, W, H, 'F')

  // Footer band — slightly darker
  doc.setFillColor(...P.footerBg)
  doc.rect(0, FOOTER_Y, W, FOOTER_H + MB, 'F')

  // Thin separator line between body and footer
  hline(doc, 0, W, FOOTER_Y, P.border, 0.4)

  // ── LEFT ACCENT BAR — the one gold moment ────────────────────────────
  doc.setFillColor(...P.accent)
  doc.rect(BAR_X, MT, BAR_W, FOOTER_Y - MT, 'F')

  // ── OUTER BORDER ────────────────────────────────────────────────────
  doc.setDrawColor(...P.border)
  doc.setLineWidth(0.4)
  doc.rect(BAR_X, MT, W - BAR_X - MR + 2, H - MT - MB)

  // ════════════════════════════════════════════════════════════════════
  // HEADER — logo lockup top-left
  // ════════════════════════════════════════════════════════════════════
  const LOGO_Y = MT + 13

  // Brain icon
  drawBrain(doc, CL + 4.5, LOGO_Y, 9, P.accent)

  // "Feyn" wordmark
  doc.setFont('times', 'italic')
  doc.setFontSize(16)
  doc.setTextColor(...P.text)
  doc.text('Feyn', CL + 11, LOGO_Y + 2)

  // Eyebrow label — top right
  doc.setFont('courier', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...P.text3)
  doc.text('CERTIFICATE OF COMPLETION', CR, MT + 8, { align: 'right', charSpace: 1.4 })

  // Cert ID top right
  doc.setFont('courier', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...P.accent)
  doc.text(cert.id, CR, MT + 15, { align: 'right' })

  // ════════════════════════════════════════════════════════════════════
  // BODY — left-aligned, generous type
  // ════════════════════════════════════════════════════════════════════
  const BODY_TOP = MT + 28

  // "has successfully completed"
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...P.text2)
  doc.text('has successfully completed', CL, BODY_TOP)

  // RECIPIENT NAME — dominant
  const nameY = BODY_TOP + 18
  const name  = cert.userName || 'Student'
  doc.setFont('times', 'normal')
  doc.setFontSize(36)
  doc.setTextColor(...P.text)
  doc.text(name, CL, nameY)

  // Thin rule under name, width-matched
  doc.setFont('times', 'normal')
  doc.setFontSize(36)
  const nameW = doc.getTextWidth(name)
  hline(doc, CL, CL + Math.min(nameW, CR - CL - 2), nameY + 2, P.accent2, 0.5)

  // Course name — second strongest, gold
  const courseY = nameY + 14
  doc.setFont('times', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...P.accent)
  const subjectName = cert.subjectName || ''
  doc.text(subjectName, CL, courseY)

  // Programme name — regular weight, muted
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...P.text2)
  doc.text(cert.programName || '', CL, courseY + 8)

  // ════════════════════════════════════════════════════════════════════
  // STATS ROW — like reference design: key numbers + labels
  // Shows: lessons completed · date of issue · certificate number
  // ════════════════════════════════════════════════════════════════════
  const STATS_Y = courseY + 22

  // Subtle rule above stats
  hline(doc, CL, CR - 60, STATS_Y - 4, P.border, 0.25)

  const dateStr = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).replace(/\//g, '.')

  const stats = [
    { val: totalLessons ? `${totalLessons}/${totalLessons}` : '—', label: 'Lessons Completed' },
    { val: dateStr,                                                  label: 'Date of Issue'     },
    { val: cert.id,                                                  label: 'Certificate ID'    },
  ]

  const statW  = (CR - 60 - CL) / stats.length
  stats.forEach((s, i) => {
    const sx = CL + i * statW

    // Value — large mono, accent for numbers / text for ID
    const isId = s.label === 'Certificate ID'
    doc.setFont('courier', 'normal')
    doc.setFontSize(isId ? 8 : 13)
    if (isId) doc.setTextColor(...P.text3); else doc.setTextColor(...P.accent)
    doc.text(s.val, sx, STATS_Y + 5)

    // Label — small sans, muted
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...P.text3)
    doc.text(s.label, sx, STATS_Y + 10)
  })

  // ════════════════════════════════════════════════════════════════════
  // FOOTER BAND — signature left · brain+wordmark centre · QR right
  // ════════════════════════════════════════════════════════════════════
  const FY   = FOOTER_Y + 6    // top of footer content
  const FCX  = W / 2           // footer centre x

  // ── Col 1: Signature ──────────────────────────────────────────────
  const sigX = CL

  if (coachSignatureUrl) {
    try {
      doc.addImage(coachSignatureUrl, 'PNG', sigX, FY + 1, 48, 12)
    } catch (_) {}
    hline(doc, sigX, sigX + 52, FY + 15, P.border2, 0.3)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...P.text2)
    doc.text(coachName || 'Instructor', sigX, FY + 20)
    doc.setFont('courier', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...P.text3)
    doc.text((coachTitle || 'Instructor').toUpperCase(), sigX, FY + 26, { charSpace: 0.5 })
  } else {
    // Italic name as signature
    doc.setFont('times', 'italic')
    doc.setFontSize(15)
    doc.setTextColor(...P.text2)
    doc.text(coachName || 'Instructor', sigX, FY + 12)
    hline(doc, sigX, sigX + 58, FY + 14, P.border, 0.25)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...P.text2)
    doc.text(coachName || 'Instructor', sigX, FY + 19)
    doc.setFont('courier', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...P.text3)
    doc.text((coachTitle || 'Instructor').toUpperCase(), sigX, FY + 25, { charSpace: 0.5 })
  }

  // ── Col 2: Feyn logo centred in footer ────────────────────────────
  drawBrain(doc, FCX - 8, FY + 14, 10, P.accent)
  doc.setFont('times', 'italic')
  doc.setFontSize(14)
  doc.setTextColor(...P.text)
  doc.text('Feyn', FCX - 1, FY + 17)

  doc.setFont('courier', 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(...P.text3)
  doc.text('free learning · first principles', FCX - 8, FY + 24, { align: 'center' })

  // ── Col 3: QR code right-aligned ─────────────────────────────────
  const qrSize = 32
  const qrX    = CR - qrSize

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, FY, qrSize, qrSize)
  }

  doc.setFont('courier', 'normal')
  doc.setFontSize(5.2)
  doc.setTextColor(...P.text3)
  doc.text('Verify at feyn.netlify.app', qrX + qrSize / 2, FY + qrSize + 3.5, { align: 'center' })

  // ── Save ──────────────────────────────────────────────────────────
  const slug = s => (s || '').replace(/\s+/g, '-')
  doc.save(`Feyn-Certificate-${slug(cert.subjectName)}-${slug(cert.userName)}.pdf`)
}
