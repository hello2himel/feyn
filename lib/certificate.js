// ============================================================
// CERTIFICATE — Feyn  (v7)
//
// Fixes:
//   · Footer content fits inside borders — nothing overflows
//   · No numTopics field
//   · coachSignatureUrl: uses real sig image if available,
//     else falls back to italic cursive-style text (no blank gap)
//   · Contrast improved: stronger text, richer gold
//   · All charSpace removed from centred text (no drift)
//
// Footer safe zone: content must end by H - B1 - 8 = ~193mm
// ============================================================

const SITE_URL = 'https://feyn.netlify.app'

const P = {
  bg:      [250, 248, 244],   // #faf8f4
  bg2:     [243, 238, 228],   // footer tint — visibly distinct
  text:    [22,  19,  14 ],   // #16130e  stronger near-black
  text2:   [72,  64,  52 ],   // #483d32  stronger mid
  text3:   [120, 110,  90],   // #786e5a  stronger muted
  gold:    [130, 86,  18 ],   // #825612  deeper, richer gold
  gold2:   [194, 161, 98 ],   // #c2a162  light gold
  gold3:   [228, 215, 185],   // #e4d7b9  pale gold hairlines
  border:  [204, 196, 178],   // #ccc4b2  warm border (stronger)
}

async function loadLogoDataUrl() {
  try {
    return await new Promise((res, rej) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = img.naturalWidth || img.width
        c.height = img.naturalHeight || img.height
        c.getContext('2d').drawImage(img, 0, 0)
        res(c.toDataURL('image/png'))
      }
      img.onerror = rej
      img.src = '/logo.png'
    })
  } catch (_) { return null }
}

async function loadSignatureDataUrl(url) {
  if (!url) return null
  try {
    return await new Promise((res, rej) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const c = document.createElement('canvas')
        c.width = img.naturalWidth || img.width
        c.height = img.naturalHeight || img.height
        c.getContext('2d').drawImage(img, 0, 0)
        res(c.toDataURL('image/png'))
      }
      img.onerror = rej
      img.src = url
    })
  } catch (_) { return null }
}

async function makeQR(url) {
  try {
    const QRCode = (await import('qrcode')).default
    return await QRCode.toDataURL(url, {
      width: 300, margin: 2,
      color: { dark: '#16130e', light: '#faf8f4' },
      errorCorrectionLevel: 'L',   // L = least error correction = least dense = easiest to scan
    })
  } catch (_) { return null }
}

function hl(doc, x1, x2, y, rgb, lw) {
  doc.setDrawColor(...rgb)
  doc.setLineWidth(lw)
  doc.line(x1, y, x2, y)
}

function drawCorners(doc, x, y, w, h, sz, rgb, lw) {
  doc.setDrawColor(...rgb)
  doc.setLineWidth(lw)
  doc.line(x,   y,   x+sz, y   ); doc.line(x,   y,   x,   y+sz)
  doc.line(x+w, y,   x+w-sz,y  ); doc.line(x+w, y,   x+w, y+sz)
  doc.line(x,   y+h, x+sz, y+h ); doc.line(x,   y+h, x,   y+h-sz)
  doc.line(x+w, y+h, x+w-sz,y+h); doc.line(x+w, y+h, x+w, y+h-sz)
}

function wrapText(doc, text, maxW) {
  const words = (text || '').split(' ')
  const lines = []; let cur = ''
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w
    if (doc.getTextWidth(t) <= maxW) { cur = t }
    else { if (cur) lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines
}

export async function downloadCertificate({
  cert, coachName, coachTitle, totalLessons,
  subjectDesc, coachSignatureUrl, isGlobal = false,
}) {
  const { jsPDF } = await import('jspdf')

  const W  = 297, H = 210, cx = W / 2

  // Borders
  const B1 = 9    // outer border inset
  const B2 = 12   // inner border inset

  // Safe content area
  const CL = 18, CR = W - 18

  // Footer — must fit ALL content above H - B1 - 6 = 195mm
  const SAFE_BOT = H - B1 - 6   // = 195mm hard ceiling
  const FTOP     = H - 54        // = 156mm footer band top

  // QR URL strategy:
  //   Global account → clean URL: feyn.netlify.app/verify/FEYN-xxx
  //     Netlify rewrites /verify/:certId → /verify/?id=FEYN-xxx
  //     Verify page does DB lookup → authoritative server-side verification
  //     No data in URL — server is the single source of truth
  //
  //   Local account  → URL with embedded payload: .../verify/FEYN-xxx?d=base64
  //     Verify page reads ?d= first, decodes cert data, shows it
  //     No DB needed — works on any device without Supabase
  //
  // isGlobal is passed from handleCert via isGlobalAccount()
  const baseVerifyUrl = `${SITE_URL}/verify/${cert.id}`

  let qrUrl
  if (isGlobal) {
    // Clean, short, authoritative — DB is the source of truth
    qrUrl = baseVerifyUrl
  } else {
    // Embed cert data so verification works without DB on any device
    try {
      const payload = btoa(JSON.stringify({
        id:          cert.id,
        userName:    cert.userName,
        subjectName: cert.subjectName,
        programName: cert.programName,
        issuedAt:    cert.issuedAt,
      }))
      qrUrl = `${baseVerifyUrl}?d=${payload}`
    } catch (_) {
      qrUrl = baseVerifyUrl
    }
  }

  const [qrDataUrl, logoDataUrl, sigDataUrl] = await Promise.all([
    makeQR(qrUrl),
    loadLogoDataUrl(),
    loadSignatureDataUrl(coachSignatureUrl),
  ])

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ── BACKGROUND ────────────────────────────────────────────────────
  doc.setFillColor(...P.bg)
  doc.rect(0, 0, W, H, 'F')

  doc.setFillColor(...P.bg2)
  doc.rect(0, FTOP, W, H - FTOP, 'F')

  // ── DOUBLE BORDER ─────────────────────────────────────────────────
  doc.setDrawColor(...P.gold2)
  doc.setLineWidth(0.5)
  doc.rect(B1, B1, W - B1*2, H - B1*2)

  doc.setDrawColor(...P.gold3)
  doc.setLineWidth(0.22)
  doc.rect(B2, B2, W - B2*2, H - B2*2)

  drawCorners(doc, B2-2, B2-2, W-(B2-2)*2, H-(B2-2)*2, 9, P.gold, 0.65)

  // ── HEADER — Feyn branding left | Cert ID right ────────────────────
  const HDR_Y = B2 + 10

  const LOGO_SZ = 8
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, 'PNG', CL, HDR_Y - LOGO_SZ*0.85, LOGO_SZ, LOGO_SZ) }
    catch (_) {}
  }

  doc.setFont('times', 'italic')
  doc.setFontSize(15)
  doc.setTextColor(...P.gold)
  doc.text('Feyn', CL + LOGO_SZ + 2, HDR_Y)

  doc.setFont('courier', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...P.text3)
  doc.text('CERT-ID', CR, HDR_Y - 2, { align: 'right' })
  doc.setFontSize(9)
  doc.setTextColor(...P.gold)
  doc.text(cert.id, CR, HDR_Y + 4, { align: 'right' })

  hl(doc, CL, CR, HDR_Y + 7, P.gold3, 0.4)

  // ── TITLE ─────────────────────────────────────────────────────────
  const titleY = HDR_Y + 21

  doc.setFont('times', 'bold')
  doc.setFontSize(27)
  doc.setTextColor(...P.gold)
  doc.text('CERTIFICATE', cx, titleY, { align: 'center' })

  doc.setFont('times', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...P.gold)
  doc.text('O F   C O M P L E T I O N', cx, titleY + 7.5, { align: 'center' })

  const ornY = titleY + 10.5
  hl(doc, cx - 24, cx - 2, ornY, P.gold3, 0.4)
  doc.setFillColor(...P.gold2)
  doc.circle(cx, ornY, 0.9, 'F')
  hl(doc, cx + 2, cx + 24, ornY, P.gold3, 0.4)

  // ── BODY ──────────────────────────────────────────────────────────
  const certifyY = ornY + 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...P.text2)
  doc.text('This is to certify that', cx, certifyY, { align: 'center' })

  // NAME — hero
  const nameY = certifyY + 15
  const name  = cert.userName || 'Student'

  doc.setFont('times', 'bold')
  doc.setFontSize(32)
  doc.setTextColor(...P.gold)
  doc.text(name, cx, nameY, { align: 'center' })

  const nameW = doc.getTextWidth(name)
  const nGap  = 8
  hl(doc, CL + 4, cx - nameW/2 - nGap, nameY - 2.5, P.border, 0.5)
  hl(doc, cx + nameW/2 + nGap, CR - 4,  nameY - 2.5, P.border, 0.5)
  hl(doc, cx - nameW/2, cx + nameW/2,   nameY + 2,   P.gold3,  0.5)

  const stmtY = nameY + 9
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...P.text2)
  doc.text('has successfully completed', cx, stmtY, { align: 'center' })

  const courseY = stmtY + 11
  doc.setFont('times', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...P.gold)
  doc.text((cert.subjectName || '').toUpperCase(), cx, courseY, { align: 'center' })

  // Course description — italic serif
  let nextY = courseY + 7
  if (subjectDesc) {
    doc.setFont('times', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(...P.text2)
    const lines = wrapText(doc, subjectDesc, CR - CL - 50)
    lines.forEach((line, i) => {
      doc.text(line, cx, nextY + i * 5, { align: 'center' })
    })
    nextY += lines.length * 5
  }

  // Programme + platform
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...P.text3)
  const issuerStr = cert.programName
    ? `${cert.programName}  ·  Feyn Learning Platform`
    : 'Feyn Learning Platform'
  doc.text(issuerStr, cx, nextY + 4, { align: 'center' })

  // ── FAINT SEAL ────────────────────────────────────────────────────
  const sealCX = cx, sealCY = FTOP + 20
  doc.setDrawColor(228, 215, 185)
  doc.setLineWidth(0.18)
  doc.circle(sealCX, sealCY, 13, 'S')
  doc.circle(sealCX, sealCY, 10.5, 'S')
  doc.setFont('times', 'italic')
  doc.setFontSize(6.5)
  doc.setTextColor(228, 215, 185)
  doc.text('Feyn', sealCX, sealCY + 2.2, { align: 'center' })

  // ── FOOTER SEPARATOR ──────────────────────────────────────────────
  hl(doc, CL, CR, FTOP, P.gold2, 0.4)

  // ── FOOTER LAYOUT ─────────────────────────────────────────────────
  // Footer content zone: FTOP + 5 → SAFE_BOT = 161 → 195mm = 34mm
  // QR: 26mm tall. Sig block: ~28mm tall. Meta: ~28mm tall.
  // Fit everything within 34mm by tightening spacing.

  const FY     = FTOP + 5        // = 161mm
  const QR_SZ  = 24              // smaller QR: 24mm so it fits
  const col2   = cx
  const col1   = CL
  const col3   = CR

  // ── COL1: Signature ───────────────────────────────────────────────
  if (sigDataUrl) {
    // Real signature image — draw it
    try {
      doc.addImage(sigDataUrl, 'PNG', col1, FY, 52, 12)
    } catch (_) {}
    hl(doc, col1, col1 + 58, FY + 14, P.border, 0.28)
    doc.setFont('times', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...P.gold)
    doc.text(coachName || 'Instructor', col1, FY + 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...P.text2)
    doc.text(coachTitle || 'Instructor', col1, FY + 26)
    doc.setFontSize(6.5)
    doc.setTextColor(...P.text3)
    doc.text('Feyn Learning Platform', col1, FY + 31)
  } else {
    // Fallback: cursive-style italic name (larger, script feel)
    doc.setFont('times', 'italic')
    doc.setFontSize(20)
    doc.setTextColor(...P.text2)
    doc.text(coachName || 'Instructor', col1, FY + 12)
    hl(doc, col1, col1 + 58, FY + 15, P.border, 0.28)
    doc.setFont('times', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...P.gold)
    doc.text(coachName || 'Instructor', col1, FY + 21)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...P.text2)
    doc.text(coachTitle || 'Instructor', col1, FY + 27)
    doc.setFontSize(6.5)
    doc.setTextColor(...P.text3)
    doc.text('Feyn Learning Platform', col1, FY + 32)
  }

  // ── COL2: QR — centred ────────────────────────────────────────────
  const qrX = col2 - QR_SZ / 2
  const qrY = FY + 2

  doc.setDrawColor(...P.gold3)
  doc.setLineWidth(0.3)
  doc.rect(qrX - 1.5, qrY - 1.5, QR_SZ + 3, QR_SZ + 3)

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, QR_SZ, QR_SZ)
  }

  // "Scan to verify" — placed right after QR box, well above safe bot
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...P.text3)
  doc.text('Scan to verify', col2, qrY + QR_SZ + 4.5, { align: 'center' })
  // qrY + QR_SZ + 4.5 = 161+2 + 24 + 4.5 = 191.5mm ✓ (under 195)

  // ── COL3: Metadata — right-anchored ──────────────────────────────
  const dateStr = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const meta = [
    { label: 'Date of Issuance', val: dateStr,                   mono: false },
    ...(totalLessons ? [{ label: 'Lessons Completed', val: `${totalLessons} of ${totalLessons}`, mono: false }] : []),
    { label: 'Certificate ID',   val: cert.id,                   mono: true  },
  ]

  // Distribute metadata vertically to match QR height (24mm + 4.5 label = 28.5mm)
  // 3 items × 9mm = 27mm, starting at FY + 2 = 163mm, ending at 190mm ✓
  const metaLineH = meta.length === 2 ? 12 : 9.5
  const metaStartY = FY + 3

  meta.forEach((m, i) => {
    const ly = metaStartY + i * metaLineH
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...P.text3)
    doc.text(m.label, col3, ly, { align: 'right' })
    doc.setFont(m.mono ? 'courier' : 'helvetica', 'normal')
    doc.setFontSize(m.mono ? 7.5 : 9.5)
    doc.setTextColor(...P.text)
    doc.text(m.val, col3, ly + 5.5, { align: 'right' })
    // last item bottom: FY+3 + 2*9.5 + 5.5 = 161+3+19+5.5 = 188.5mm ✓
  })

  // ── Save ──────────────────────────────────────────────────────────
  const slug = s => (s || '').replace(/\s+/g, '-')
  doc.save(`Feyn-Certificate-${slug(cert.subjectName)}-${slug(cert.userName)}.pdf`)
}
