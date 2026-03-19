// ============================================================
// CERTIFICATE GENERATOR — Feyn v22
// Light mode, site design language (serif headings, mono labels,
// gold accent), embedded QR code for online verification.
//
// Verify URL: /verify/[certId]
// QR code generated client-side via the `qrcode` npm package.
// ============================================================

const SITE_URL = 'https://feyn.netlify.app'

// Palette — light mode
const C = {
  pageBg:      [252, 251, 248],   // warm off-white
  outerBorder: [210, 180, 110],   // gold border
  innerBorder: [230, 210, 165],   // lighter gold inner
  topBand:     [248, 245, 238],   // very subtle warm tint for top section
  divider:     [220, 215, 200],   // soft divider
  footerBg:    [245, 242, 234],   // footer band
  textDark:    [22,  20,  16 ],   // near-black
  textMid:     [90,  82,  65 ],   // warm mid-grey
  textLight:   [150, 140, 118],   // muted label
  gold:        [170, 135, 60 ],   // gold accent
  goldLight:   [200, 168, 100],   // lighter gold (lines)
  certIdText:  [120, 110, 88 ],   // monospace cert ID
  validGreen:  [40,  120, 70 ],   // ✓ valid indicator
}

async function makeQRDataUrl(text) {
  try {
    const QRCode = (await import('qrcode')).default
    return await QRCode.toDataURL(text, {
      width: 120,
      margin: 1,
      color: { dark: '#16140f', light: '#fcfbf8' },
      errorCorrectionLevel: 'M',
    })
  } catch (_) {
    return null
  }
}

export async function downloadCertificate({ cert, coachName, coachSignatureUrl }) {
  const { jsPDF } = await import('jspdf')

  const W = 297   // A4 landscape mm
  const H = 210
  const cx = W / 2

  // Build verify URL and QR code
  const verifyUrl = `${SITE_URL}/verify/${cert.id}`
  const qrDataUrl = await makeQRDataUrl(verifyUrl)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ── Page background (warm white) ─────────────────────────
  doc.setFillColor(...C.pageBg)
  doc.rect(0, 0, W, H, 'F')

  // ── Top decorative band ───────────────────────────────────
  doc.setFillColor(...C.topBand)
  doc.rect(0, 0, W, 72, 'F')

  // ── Outer gold border ────────────────────────────────────
  doc.setDrawColor(...C.outerBorder)
  doc.setLineWidth(1.2)
  doc.rect(7, 7, W - 14, H - 14)

  // Inner fine rule
  doc.setDrawColor(...C.innerBorder)
  doc.setLineWidth(0.3)
  doc.rect(11, 11, W - 22, H - 22)

  // ── Corner ornaments — small L-brackets in gold ───────────
  doc.setDrawColor(...C.outerBorder)
  doc.setLineWidth(0.8)
  const cs = 7   // corner bracket size
  ;[[14,14],[W-14,14],[14,H-14],[W-14,H-14]].forEach(([x, y], i) => {
    const sx = i % 2 === 0 ? 1 : -1
    const sy = i < 2 ? 1 : -1
    doc.line(x, y, x + sx * cs, y)
    doc.line(x, y, x, y + sy * cs)
  })

  // ── Feyn wordmark ─────────────────────────────────────────
  doc.setFont('times', 'italic')
  doc.setFontSize(11)
  doc.setTextColor(...C.gold)
  doc.text('Feyn', cx, 24, { align: 'center' })

  // Fine rule under wordmark
  doc.setDrawColor(...C.goldLight)
  doc.setLineWidth(0.25)
  doc.line(cx - 18, 27, cx + 18, 27)

  // ── "Certificate of Completion" ──────────────────────────
  doc.setFont('times', 'normal')
  doc.setFontSize(26)
  doc.setTextColor(...C.textDark)
  doc.text('Certificate of Completion', cx, 44, { align: 'center' })

  // ── "This certifies that" ────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.textLight)
  doc.text('THIS CERTIFIES THAT', cx, 56, { align: 'center', charSpace: 1.2 })

  // ── Divider rule ─────────────────────────────────────────
  doc.setDrawColor(...C.divider)
  doc.setLineWidth(0.3)
  doc.line(30, 60, W - 30, 60)

  // ── Student name ─────────────────────────────────────────
  doc.setFont('times', 'bolditalic')
  doc.setFontSize(38)
  doc.setTextColor(...C.textDark)
  doc.text(cert.userName || 'Student', cx, 82, { align: 'center' })

  // Gold underline under name, width-matched
  const nameW = doc.getTextWidth(cert.userName || 'Student')
  doc.setDrawColor(...C.outerBorder)
  doc.setLineWidth(0.5)
  doc.line(cx - nameW / 2, 85, cx + nameW / 2, 85)

  // ── "has successfully completed" ────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.textLight)
  doc.text('has successfully completed', cx, 95, { align: 'center' })

  // ── Course name ──────────────────────────────────────────
  doc.setFont('times', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...C.gold)
  doc.text(`${cert.programName}  ·  ${cert.subjectName}`, cx, 109, { align: 'center' })

  // ── Footer band ───────────────────────────────────────────
  doc.setFillColor(...C.footerBg)
  doc.rect(11.5, 122, W - 23, 75, 'F')

  // Top rule of footer
  doc.setDrawColor(...C.divider)
  doc.setLineWidth(0.4)
  doc.line(30, 122, W - 30, 122)

  // ── Footer three columns ──────────────────────────────────
  const dateStr = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // Helper — column label
  function colLabel(text, x, y) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...C.textLight)
    doc.text(text, x, y, { align: 'center', charSpace: 1 })
  }
  // Helper — column value
  function colValue(text, x, y, fontStyle = 'normal', size = 10.5) {
    doc.setFont('times', fontStyle)
    doc.setFontSize(size)
    doc.setTextColor(...C.textDark)
    doc.text(text, x, y, { align: 'center' })
  }
  // Helper — thin underline for columns
  function colLine(x, y, half = 28) {
    doc.setDrawColor(...C.divider)
    doc.setLineWidth(0.2)
    doc.line(x - half, y, x + half, y)
  }

  // Columns: [Date | Instructor | Cert ID+QR]
  // Date — left col
  const dateX = qrDataUrl ? 52 : cx
  colLabel('DATE OF ISSUE', dateX, 133)
  colValue(dateStr, dateX, 143)
  colLine(dateX, 147)

  // Instructor — middle col
  const instrX = qrDataUrl ? cx : cx + 50
  colLabel('INSTRUCTOR', instrX, 133)
  if (coachSignatureUrl) {
    try { doc.addImage(coachSignatureUrl, 'PNG', instrX - 28, 135, 56, 12) } catch (_) {}
    colLine(instrX, 150)
    colLabel(coachName || 'Instructor', instrX, 154)
  } else {
    doc.setFont('times', 'bolditalic')
    doc.setFontSize(13)
    doc.setTextColor(...C.gold)
    doc.text(coachName || 'Instructor', instrX, 143, { align: 'center' })
    colLine(instrX, 147)
    colLabel(coachName || 'Instructor', instrX, 151)
  }

  // ── Right column: QR + cert ID (or cert ID only if no QR) ─
  if (qrDataUrl) {
    const qrX = W - 52
    colLabel('VERIFY CERTIFICATE', qrX, 133)
    // QR image — 22×22 mm
    const qrSize = 22
    doc.addImage(qrDataUrl, 'PNG', qrX - qrSize / 2, 136, qrSize, qrSize)
    // Cert ID below QR
    doc.setFont('courier', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...C.certIdText)
    doc.text(cert.id, qrX, 162, { align: 'center' })
  } else {
    // No QR (qrcode package unavailable) — just show cert ID centered
    colLabel('CERTIFICATE ID', cx + 55, 133)
    doc.setFont('courier', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.certIdText)
    doc.text(cert.id, cx + 55, 143, { align: 'center' })
    colLine(cx + 55, 147, 34)
  }

  // ── ✓ Valid indicator strip at very bottom ────────────────
  doc.setDrawColor(...C.divider)
  doc.setLineWidth(0.25)
  doc.line(30, 172, W - 30, 172)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...C.validGreen)
  doc.text('✓  VALID CERTIFICATE', cx - 30, 179)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...C.textLight)
  doc.text(`Verify at ${verifyUrl}`, cx + 10, 179)

  // ── Bottom watermark ──────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...C.divider)
  doc.text(`Feyn · ${cert.id}`, cx, H - 8, { align: 'center' })

  // ── Save ─────────────────────────────────────────────────
  const slug = (s) => (s || '').replace(/\s+/g, '-')
  doc.save(`Feyn-Certificate-${slug(cert.subjectName)}-${slug(cert.userName)}.pdf`)
}
