// ============================================================
// CERTIFICATE GENERATOR — Feyn v23  (print-grade redesign)
//
// Design concept: "Oxford Gazette"
//
//   Structure:
//     · Left vertical gold spine rule — resolves header asymmetry,
//       anchors the whole page, gives it institutional backbone.
//     · Header: asymmetric (left: brand + eyebrow, right: cert ID block).
//     · Body: fully centered in pure whitespace.
//     · Footer: ruled 3-column grid (signature | seal | QR).
//
//   Typography:
//     · times italic       → Libre Baskerville proxy (wordmark, name, sig)
//     · times bold         → Libre Baskerville bold  (course name)
//     · helvetica normal   → DM Sans proxy            (supporting copy)
//     · courier normal     → JetBrains Mono proxy     (IDs, labels)
//
//   Color: light-mode only — print-friendly warm off-white (#faf8f4).
//
// Verify URL: /verify/?id=[certId]
// QR: gold-on-light, generated via `qrcode` npm package.
// ============================================================

const SITE_URL = 'https://feyn.netlify.app'

// ── Light-mode palette (globals.css [data-theme="light"]) ────────────
const C = {
  bg:         [250, 248, 244],   // --bg       #faf8f4  warm off-white
  bg2:        [243, 240, 234],   // --bg-2     #f3f0ea  header/footer tint
  border:     [216, 210, 196],   // --border   #d8d2c4
  border2:    [200, 193, 176],   // --border-2 #c8c1b0
  text:       [26,  23,  19 ],   // --text     #1a1713  near-black warm
  text2:      [90,  82,  72 ],   // --text-2   #5a5248  mid-warm
  text3:      [154, 144, 128],   // --text-3   #9a9080  muted
  accent:     [139, 94,  26 ],   // --accent   #8b5e1a  deep amber-gold
  accent2:    [200, 169, 110],   // --accent-2 #c8a96e  lighter gold
  accentPale: [230, 215, 185],   // pale gold  — hairlines only
}

async function makeQRDataUrl(text) {
  try {
    const QRCode = (await import('qrcode')).default
    return await QRCode.toDataURL(text, {
      width: 180,
      margin: 1,
      color: { dark: '#1a1713', light: '#faf8f4' },
      errorCorrectionLevel: 'M',
    })
  } catch (_) { return null }
}

// ── Thin horizontal rule helper ───────────────────────────────────────
function hRule(doc, x1, x2, y, rgb, lw = 0.25) {
  doc.setDrawColor(...rgb)
  doc.setLineWidth(lw)
  doc.line(x1, y, x2, y)
}

export async function downloadCertificate({ cert, coachName, coachSignatureUrl }) {
  const { jsPDF } = await import('jspdf')

  // ── Canvas constants ──────────────────────────────────────────────
  const W  = 297          // A4 landscape mm
  const H  = 210
  const M  = 14           // safe-area inset
  const cx = W / 2        // page centre-x

  const verifyUrl = `${SITE_URL}/verify/?id=${cert.id}`
  const qrDataUrl = await makeQRDataUrl(verifyUrl)

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ── Background ───────────────────────────────────────────────────
  doc.setFillColor(...C.bg)
  doc.rect(0, 0, W, H, 'F')

  // ── Outer border (single hairline gold) ──────────────────────────
  doc.setDrawColor(...C.accent2)
  doc.setLineWidth(0.5)
  doc.rect(M, M, W - M * 2, H - M * 2)

  // ══════════════════════════════════════════════════════════════════
  // LEFT SPINE
  //   The key design move: a continuous vertical gold rule that runs
  //   the full inner height. Creates institutional backbone and
  //   resolves the header's left-right asymmetry visually.
  //   A pale hairline 2 mm to its right adds depth without noise.
  // ══════════════════════════════════════════════════════════════════
  const spineX   = M + 21           // x of main spine rule
  const spineTop = M + 0.5
  const spineBot = H - M - 0.5

  doc.setDrawColor(...C.accent)
  doc.setLineWidth(0.7)
  doc.line(spineX, spineTop, spineX, spineBot)

  doc.setDrawColor(...C.accentPale)
  doc.setLineWidth(0.2)
  doc.line(spineX + 2, spineTop + 6, spineX + 2, spineBot - 6)

  // "Feyn" rotated vertically inside the spine margin — very faint,
  // institutional watermark feel
  doc.setFont('times', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...C.accentPale)
  doc.text('Feyn', spineX - 4, H / 2, { angle: 90, align: 'center' })

  // ══════════════════════════════════════════════════════════════════
  // HEADER — asymmetric authority bar
  //   Left:  Feyn wordmark (italic serif) + eyebrow label
  //   Right: CERT-ID block (right-aligned, monospace)
  //   Height: top of safe area → ~22% down
  // ══════════════════════════════════════════════════════════════════
  const hLeft     = spineX + 8       // left content edge
  const hRight    = W - M - 5        // right content edge
  const headerH   = 44               // header zone height in mm
  const headerTop = M
  const headerBot = M + headerH

  // Header background tint
  doc.setFillColor(...C.bg2)
  doc.rect(spineX + 1, headerTop + 0.5, W - M - spineX - 1, headerH - 0.5, 'F')

  // ── LEFT: wordmark ────────────────────────────────────────────────
  const logoY = headerTop + 15
  doc.setFont('times', 'italic')
  doc.setFontSize(17)
  doc.setTextColor(...C.accent)
  doc.text('Feyn', hLeft, logoY)

  // Year superscript beside wordmark
  const wmW = doc.getTextWidth('Feyn')
  doc.setFont('courier', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...C.text3)
  doc.text(
    new Date(cert.issuedAt).getFullYear().toString(),
    hLeft + wmW + 2,
    logoY - 5
  )

  // ── LEFT: eyebrow ─────────────────────────────────────────────────
  doc.setFont('courier', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...C.text3)
  doc.text('CERTIFICATE  OF  COMPLETION', hLeft, logoY + 8, { charSpace: 1.5 })

  // ── RIGHT: cert ID block ──────────────────────────────────────────
  const idY = headerTop + 13
  doc.setFont('courier', 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(...C.text3)
  doc.text('CERT-ID', hRight, idY, { align: 'right', charSpace: 1 })

  doc.setFont('courier', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...C.accent)
  doc.text(cert.id, hRight, idY + 7, { align: 'right' })

  const shortProg = (cert.programName || '').toUpperCase().slice(0, 28)
  doc.setFont('courier', 'normal')
  doc.setFontSize(5)
  doc.setTextColor(...C.text3)
  doc.text(shortProg, hRight, idY + 13, { align: 'right', charSpace: 0.4 })

  // ── Header bottom rules ───────────────────────────────────────────
  hRule(doc, spineX + 1, W - M, headerBot,       C.border,     0.35)
  hRule(doc, spineX + 1, W - M, headerBot - 1.5, C.accentPale, 0.2)

  // ══════════════════════════════════════════════════════════════════
  // CENTRAL BODY — fully centered, generous whitespace
  //   Zone: headerBot → footerTop
  // ══════════════════════════════════════════════════════════════════
  const footerH   = 47              // footer zone height
  const footerTop = H - M - footerH
  const bodyTop   = headerBot
  const bodyH     = footerTop - bodyTop

  // Vertical anchor: optically centered in body zone
  // "This is to certify that" sits ~26% from top of body zone
  const certifyY  = bodyTop + bodyH * 0.26
  const nameY     = certifyY + 19
  const completedY = nameY + 13
  const courseY   = completedY + 11
  const programY  = courseY + 7
  const metaY     = programY + 10

  // ── "THIS IS TO CERTIFY THAT" — flanked by pale rules ────────────
  doc.setFont('courier', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.text3)
  doc.text('THIS IS TO CERTIFY THAT', cx, certifyY, { align: 'center', charSpace: 1.8 })
  hRule(doc, cx - 52, cx - 39, certifyY - 1.5, C.accentPale)
  hRule(doc, cx + 39, cx + 52, certifyY - 1.5, C.accentPale)

  // ── RECIPIENT NAME — dominant element ────────────────────────────
  const displayName = cert.userName || 'Student'
  doc.setFont('times', 'italic')
  doc.setFontSize(40)
  doc.setTextColor(...C.text)
  doc.text(displayName, cx, nameY, { align: 'center' })

  // Gold underline, width-matched to rendered name
  const nameW = doc.getTextWidth(displayName)
  hRule(doc, cx - nameW / 2, cx + nameW / 2, nameY + 2.8, C.accent2, 0.55)

  // ── "has successfully completed" ──────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.text2)
  doc.text('has successfully completed', cx, completedY, { align: 'center' })

  // ── Course / subject name ─────────────────────────────────────────
  doc.setFont('times', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...C.accent)
  doc.text(cert.subjectName || '', cx, courseY, { align: 'center' })

  // ── Programme name ────────────────────────────────────────────────
  if (cert.programName) {
    doc.setFont('times', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...C.text2)
    doc.text(cert.programName, cx, programY, { align: 'center' })
  }

  // ── Issue date — mono, small ──────────────────────────────────────
  const dateStr = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  doc.setFont('courier', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...C.text3)
  doc.text(dateStr.toUpperCase(), cx, metaY, { align: 'center', charSpace: 0.8 })

  // ══════════════════════════════════════════════════════════════════
  // FOOTER — 3-column validation zone
  //   Col 1: Signature block
  //   Col 2: Circular seal (monoline)
  //   Col 3: QR code + cert ID
  // ══════════════════════════════════════════════════════════════════

  // Footer top rules
  hRule(doc, spineX + 1, W - M, footerTop - 1.5, C.accentPale, 0.2)
  hRule(doc, spineX + 1, W - M, footerTop,       C.border,     0.4)

  // Footer background tint
  doc.setFillColor(...C.bg2)
  doc.rect(spineX + 1, footerTop + 0.5, W - M - spineX - 1, H - M - footerTop - 0.5, 'F')

  // Column centres (three equal columns from spine to right margin)
  const footerContentW = (W - M) - (spineX + 1)
  const colW     = footerContentW / 3
  const col1X    = spineX + 1 + colW * 0.5
  const col2X    = spineX + 1 + colW * 1.5
  const col3X    = spineX + 1 + colW * 2.5

  // Vertical column dividers
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.2)
  doc.line(spineX + 1 + colW,     footerTop + 0.5, spineX + 1 + colW,     H - M - 7.5)
  doc.line(spineX + 1 + colW * 2, footerTop + 0.5, spineX + 1 + colW * 2, H - M - 7.5)

  const fLabelY  = footerTop + 10
  const fValY    = fLabelY + 7

  // ── Column label helper ───────────────────────────────────────────
  function fLabel(text, x, y) {
    doc.setFont('courier', 'normal')
    doc.setFontSize(5)
    doc.setTextColor(...C.text3)
    doc.text(text.toUpperCase(), x, y, { align: 'center', charSpace: 1.2 })
  }
  function fRule(x, y, half = 20) {
    hRule(doc, x - half, x + half, y, C.border2, 0.2)
  }

  // ── COL 1: Signature ──────────────────────────────────────────────
  fLabel('Instructor', col1X, fLabelY)

  if (coachSignatureUrl) {
    try {
      doc.addImage(coachSignatureUrl, 'PNG', col1X - 22, fLabelY + 1, 44, 10)
    } catch (_) {}
    fRule(col1X, fLabelY + 13)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...C.text2)
    doc.text(coachName || 'Instructor', col1X, fLabelY + 18, { align: 'center' })
  } else {
    // Italic name in accent color as signature stand-in
    doc.setFont('times', 'italic')
    doc.setFontSize(11)
    doc.setTextColor(...C.accent)
    doc.text(coachName || 'Instructor', col1X, fValY + 4, { align: 'center' })
    fRule(col1X, fValY + 7.5)
    doc.setFont('courier', 'normal')
    doc.setFontSize(4.5)
    doc.setTextColor(...C.text3)
    doc.text('INSTRUCTOR', col1X, fValY + 12, { align: 'center', charSpace: 0.8 })
  }

  // ── COL 2: Monoline seal ──────────────────────────────────────────
  const sealCX = col2X
  const sealCY = footerTop + footerH * 0.52
  const r1 = 12, r2 = 9.5

  doc.setDrawColor(...C.accent2)
  doc.setLineWidth(0.4)
  doc.circle(sealCX, sealCY, r1)

  doc.setDrawColor(...C.accentPale)
  doc.setLineWidth(0.2)
  doc.circle(sealCX, sealCY, r2)

  // "Feyn" inside seal
  doc.setFont('times', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...C.accent)
  doc.text('Feyn', sealCX, sealCY + 2.8, { align: 'center' })

  // Arc text "· VERIFIED ·" around top of seal
  const arcText  = '· VERIFIED ·'
  const arcR     = r1 - 0.8
  const arcSpan  = Math.PI * 0.72
  const arcStart = -Math.PI / 2 - arcSpan / 2
  const arcStep  = arcSpan / (arcText.length - 1)
  doc.setFont('courier', 'normal')
  doc.setFontSize(4)
  doc.setTextColor(...C.text3)
  arcText.split('').forEach((ch, i) => {
    const a = arcStart + i * arcStep
    doc.text(ch, sealCX + arcR * Math.cos(a), sealCY + arcR * Math.sin(a), { align: 'center' })
  })

  // Year arc at bottom of seal
  const yearStr  = new Date(cert.issuedAt).getFullYear().toString()
  const ySpan    = Math.PI * 0.38
  const yStart   = Math.PI / 2 - ySpan / 2
  const yStep    = ySpan / (yearStr.length - 1)
  yearStr.split('').forEach((ch, i) => {
    const a = yStart + i * yStep
    doc.text(ch, sealCX + arcR * Math.cos(a), sealCY + arcR * Math.sin(a), { align: 'center' })
  })

  // ── COL 3: QR code + cert ID ──────────────────────────────────────
  fLabel('Verify Certificate', col3X, fLabelY)

  if (qrDataUrl) {
    const qrSize = 22
    doc.addImage(qrDataUrl, 'PNG', col3X - qrSize / 2, fLabelY + 1.5, qrSize, qrSize)
    doc.setFont('courier', 'normal')
    doc.setFontSize(5)
    doc.setTextColor(...C.text3)
    doc.text(cert.id, col3X, fLabelY + qrSize + 5, { align: 'center', charSpace: 0.4 })
  } else {
    doc.setFont('courier', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.accent)
    doc.text(cert.id, col3X, fValY + 4, { align: 'center' })
    fRule(col3X, fValY + 7.5)
    doc.setFont('courier', 'normal')
    doc.setFontSize(4.5)
    doc.setTextColor(...C.text3)
    doc.text('feyn.netlify.app', col3X, fValY + 12, { align: 'center' })
  }

  // ── Colophon strip ────────────────────────────────────────────────
  hRule(doc, spineX + 1, W - M, H - M - 7, C.border, 0.25)
  doc.setFont('courier', 'normal')
  doc.setFontSize(4.5)
  doc.setTextColor(...C.text3)
  doc.text(
    `${verifyUrl}   ·   ${cert.id}`,
    cx, H - M - 3.5,
    { align: 'center', charSpace: 0.3 }
  )

  // ── Save ──────────────────────────────────────────────────────────
  const slug = (s) => (s || '').replace(/\s+/g, '-')
  doc.save(`Feyn-Certificate-${slug(cert.subjectName)}-${slug(cert.userName)}.pdf`)
}
