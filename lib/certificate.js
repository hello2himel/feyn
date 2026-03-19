// ============================================================
// CERTIFICATE GENERATOR — Feyn v23
//
// Design language: matches the site exactly.
//   • Dark warm background  (#0d0d0d / #141414)
//   • Gold accent           (#c8a96e / #8b6f3e)
//   • Libre Baskerville for headings (via Times in jsPDF)
//   • DM Sans / Helvetica for labels
//   • JetBrains Mono / Courier for IDs
//   • 2 px sharp corner rule (no rounded corners)
//   • Horizontal gold rule separators (like .hero__rule)
//   • Mono uppercase eyebrow labels with wide letter-spacing
//
// Verify URL: /verify/?id=[certId]
// QR code generated client-side via the `qrcode` npm package.
// ============================================================

const SITE_URL = 'https://feyn.netlify.app'

// ── Palette (mirrors globals.css dark theme) ──────────────────────────
const C = {
  bg:          [13,  13,  13 ],   // --bg        #0d0d0d
  bg2:         [20,  20,  20 ],   // --bg-2      #141414
  bg3:         [26,  26,  26 ],   // --bg-3      #1a1a1a
  border:      [42,  42,  42 ],   // --border    #2a2a2a
  border2:     [51,  51,  51 ],   // --border-2  #333333
  text:        [232, 227, 216],   // --text      #e8e3d8
  text2:       [154, 148, 136],   // --text-2    #9a9488
  text3:       [92,  88,  82 ],   // --text-3    #5c5852
  accent:      [200, 169, 110],   // --accent    #c8a96e
  accent2:     [139, 111, 62 ],   // --accent-2  #8b6f3e
  accentDim:   [80,  62,  30 ],   // dimmer gold for inner borders
  valid:       [39,  174, 96 ],   // --success   #27ae60
}

async function makeQRDataUrl(text) {
  try {
    const QRCode = (await import('qrcode')).default
    return await QRCode.toDataURL(text, {
      width: 160,
      margin: 1,
      color: { dark: '#c8a96e', light: '#0d0d0d' },   // gold on dark
      errorCorrectionLevel: 'M',
    })
  } catch (_) {
    return null
  }
}

export async function downloadCertificate({ cert, coachName, coachSignatureUrl }) {
  const { jsPDF } = await import('jspdf')

  const W  = 297   // A4 landscape mm
  const H  = 210
  const cx = W / 2

  // Build verify URL  (new static-friendly format)
  const verifyUrl = `${SITE_URL}/verify/?id=${cert.id}`
  const qrDataUrl = await makeQRDataUrl(verifyUrl)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ── Full dark background ──────────────────────────────────────────
  doc.setFillColor(...C.bg)
  doc.rect(0, 0, W, H, 'F')

  // ── Outer border — gold, thin ─────────────────────────────────────
  doc.setDrawColor(...C.accent2)
  doc.setLineWidth(0.6)
  doc.rect(8, 8, W - 16, H - 16)

  // ── Inner border — dimmer gold, hairline ──────────────────────────
  doc.setDrawColor(...C.accentDim)
  doc.setLineWidth(0.25)
  doc.rect(12, 12, W - 24, H - 24)

  // ── Corner L-brackets (sharp, matches radius:2px aesthetic) ───────
  doc.setDrawColor(...C.accent)
  doc.setLineWidth(0.7)
  const cs = 8
  ;[[15, 15], [W-15, 15], [15, H-15], [W-15, H-15]].forEach(([x, y], i) => {
    const sx = i % 2 === 0 ? 1 : -1
    const sy = i < 2 ? 1 : -1
    doc.line(x, y, x + sx * cs, y)
    doc.line(x, y, x, y + sy * cs)
  })

  // ── Header band (bg-2 fill) ───────────────────────────────────────
  doc.setFillColor(...C.bg2)
  doc.rect(12.5, 12.5, W - 25, 62, 'F')

  // Bottom rule of header band
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(20, 74.5, W - 20, 74.5)

  // ── Gold accent rule (mirrors .hero__rule — 24px wide, 1.5px tall) ─
  const ruleW = 24
  doc.setFillColor(...C.accent)
  doc.rect(cx - ruleW / 2, 22, ruleW, 1.5, 'F')

  // ── "Feyn" wordmark — serif italic, gold ─────────────────────────
  doc.setFont('times', 'italic')
  doc.setFontSize(13)
  doc.setTextColor(...C.accent)
  doc.text('Feyn', cx, 32, { align: 'center' })

  // ── Eyebrow label — mono uppercase (mirrors .page-header__eyebrow) ─
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.text3)
  doc.text('CERTIFICATE OF COMPLETION', cx, 42, { align: 'center', charSpace: 1.8 })

  // Thin rule under eyebrow
  doc.setDrawColor(...C.border2)
  doc.setLineWidth(0.2)
  doc.line(cx - 36, 45, cx + 36, 45)

  // ── Student name — large serif italic ────────────────────────────
  doc.setFont('times', 'bolditalic')
  doc.setFontSize(36)
  doc.setTextColor(...C.text)
  const displayName = cert.userName || 'Student'
  doc.text(displayName, cx, 64, { align: 'center' })

  // Gold underline width-matched to name
  const nameW = doc.getTextWidth(displayName)
  doc.setDrawColor(...C.accent2)
  doc.setLineWidth(0.5)
  doc.line(cx - nameW / 2, 67, cx + nameW / 2, 67)

  // ── "has successfully completed" — muted ─────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.text2)
  doc.text('has successfully completed', cx, 82, { align: 'center' })

  // ── Course name — gold serif ──────────────────────────────────────
  doc.setFont('times', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...C.accent)
  doc.text(`${cert.programName}  ·  ${cert.subjectName}`, cx, 95, { align: 'center' })

  // ── Separator rule ────────────────────────────────────────────────
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.3)
  doc.line(20, 103, W - 20, 103)

  // ── Footer zone — bg-2 fill ───────────────────────────────────────
  doc.setFillColor(...C.bg2)
  doc.rect(12.5, 103.5, W - 25, H - 116, 'F')

  // ── Column helpers ────────────────────────────────────────────────
  function colLabel(text, x, y) {
    doc.setFont('courier', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...C.text3)
    doc.text(text.toUpperCase(), x, y, { align: 'center', charSpace: 1.2 })
  }
  function colValue(text, x, y, size = 10, style = 'normal') {
    doc.setFont('times', style)
    doc.setFontSize(size)
    doc.setTextColor(...C.text)
    doc.text(text, x, y, { align: 'center' })
  }
  function colRule(x, y, half = 26) {
    doc.setDrawColor(...C.border2)
    doc.setLineWidth(0.2)
    doc.line(x - half, y, x + half, y)
  }

  const dateStr = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Three-column footer ───────────────────────────────────────────
  const leftX  = qrDataUrl ? 52   : cx - 50
  const midX   = cx
  const rightX = qrDataUrl ? W - 52 : cx + 50
  const labelY = 117
  const valY   = 128
  const ruleY  = 132

  // Left: Date
  colLabel('Date of Issue', leftX, labelY)
  colValue(dateStr, leftX, valY, 9.5)
  colRule(leftX, ruleY)

  // Centre: Instructor
  colLabel('Instructor', midX, labelY)
  if (coachSignatureUrl) {
    try {
      doc.addImage(coachSignatureUrl, 'PNG', midX - 28, valY - 10, 56, 13)
    } catch (_) {}
    colRule(midX, ruleY + 4)
    colLabel(coachName || 'Instructor', midX, ruleY + 9)
  } else {
    doc.setFont('times', 'bolditalic')
    doc.setFontSize(12)
    doc.setTextColor(...C.accent)
    doc.text(coachName || 'Instructor', midX, valY, { align: 'center' })
    colRule(midX, ruleY)
  }

  // Right: QR + cert ID
  if (qrDataUrl) {
    colLabel('Verify Certificate', rightX, labelY)
    const qrSize = 26
    doc.addImage(qrDataUrl, 'PNG', rightX - qrSize / 2, labelY + 3, qrSize, qrSize)
    doc.setFont('courier', 'normal')
    doc.setFontSize(5.5)
    doc.setTextColor(...C.text3)
    doc.text(cert.id, rightX, labelY + qrSize + 7, { align: 'center' })
  } else {
    colLabel('Certificate ID', rightX, labelY)
    doc.setFont('courier', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...C.text2)
    doc.text(cert.id, rightX, valY, { align: 'center' })
    colRule(rightX, ruleY, 32)
  }

  // ── Separator above validity strip ───────────────────────────────
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.25)
  doc.line(20, H - 24, W - 20, H - 24)

  // ── Validity strip — green dot + mono text ────────────────────────
  doc.setFillColor(...C.valid)
  doc.circle(cx - 28, H - 17, 1.2, 'F')

  doc.setFont('courier', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.valid)
  doc.text('VALID CERTIFICATE', cx - 22, H - 15.5, { charSpace: 1 })

  doc.setTextColor(...C.border2)
  doc.text('|', cx + 20, H - 15.5)

  doc.setFont('courier', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.text3)
  doc.text(verifyUrl, cx + 26, H - 15.5)

  // ── Watermark ─────────────────────────────────────────────────────
  doc.setFont('courier', 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(...C.accentDim)
  doc.text(`Feyn · ${cert.id}`, cx, H - 5, { align: 'center', charSpace: 0.5 })

  // ── Save ──────────────────────────────────────────────────────────
  const slug = (s) => (s || '').replace(/\s+/g, '-')
  doc.save(`Feyn-Certificate-${slug(cert.subjectName)}-${slug(cert.userName)}.pdf`)
}
