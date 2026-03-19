// ============================================================
// CERTIFICATE GENERATOR — Feyn v18
// Renders a styled certificate to PDF via jsPDF (client-only)
// ============================================================

export async function downloadCertificate({ cert, coachName, coachSignatureUrl }) {
  const { jsPDF } = await import('jspdf')

  const W = 297  // A4 landscape mm
  const H = 210

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ── Background ────────────────────────────────────────────
  doc.setFillColor(11, 11, 14)
  doc.rect(0, 0, W, H, 'F')

  // Subtle gradient bands (simulated with layered rects)
  doc.setFillColor(18, 16, 24)
  doc.rect(0, 0, W, H * 0.45, 'F')

  // ── Outer border ─────────────────────────────────────────
  doc.setDrawColor(180, 148, 90)
  doc.setLineWidth(0.8)
  doc.rect(9, 9, W - 18, H - 18)

  // Inner thin border
  doc.setLineWidth(0.2)
  doc.setDrawColor(120, 100, 60)
  doc.rect(13, 13, W - 26, H - 26)

  // ── Corner ornaments ──────────────────────────────────────
  const gold = [180, 148, 90]
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.5)
  const corners = [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]]
  corners.forEach(([x, y]) => {
    doc.line(x - 5, y, x + 5, y)
    doc.line(x, y - 5, x, y + 5)
    // Small diamond
    doc.line(x - 2, y, x, y - 2)
    doc.line(x, y - 2, x + 2, y)
    doc.line(x + 2, y, x, y + 2)
    doc.line(x, y + 2, x - 2, y)
  })

  // ── Header rule + platform name ───────────────────────────
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.3)
  doc.line(W / 2 - 50, 30, W / 2 + 50, 30)

  doc.setFont('times', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(...gold)
  doc.text('Feyn', W / 2, 26, { align: 'center' })

  // ── Certificate title ─────────────────────────────────────
  doc.setFont('times', 'normal')
  doc.setFontSize(30)
  doc.setTextColor(232, 225, 210)
  doc.text('Certificate of Completion', W / 2, 52, { align: 'center' })

  // Thin rule under title
  doc.setDrawColor(55, 50, 42)
  doc.setLineWidth(0.25)
  doc.line(W / 2 - 65, 58, W / 2 + 65, 58)

  // ── "This certifies that" ────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(140, 134, 120)
  doc.text('This certifies that', W / 2, 70, { align: 'center' })

  // ── Student name ──────────────────────────────────────────
  doc.setFont('times', 'bolditalic')
  doc.setFontSize(34)
  doc.setTextColor(232, 225, 210)
  doc.text(cert.userName || 'Student', W / 2, 88, { align: 'center' })

  const nameWidth = doc.getTextWidth(cert.userName || 'Student')
  doc.setDrawColor(...gold)
  doc.setLineWidth(0.35)
  doc.line(W / 2 - nameWidth / 2, 91, W / 2 + nameWidth / 2, 91)

  // ── "has successfully completed" ─────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(140, 134, 120)
  doc.text('has successfully completed', W / 2, 101, { align: 'center' })

  // ── Course name ───────────────────────────────────────────
  doc.setFont('times', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...gold)
  doc.text(`${cert.programName} · ${cert.subjectName}`, W / 2, 114, { align: 'center' })

  // ── Divider ───────────────────────────────────────────────
  doc.setDrawColor(38, 35, 30)
  doc.setLineWidth(0.3)
  doc.line(28, 128, W - 28, 128)

  // ── Bottom three columns ──────────────────────────────────
  const dateStr = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  // Left — Date
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(80, 76, 68)
  doc.text('DATE OF ISSUE', 52, 140, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(195, 188, 170)
  doc.text(dateStr, 52, 149, { align: 'center' })
  doc.setDrawColor(55, 50, 42)
  doc.setLineWidth(0.2)
  doc.line(22, 153, 82, 153)

  // Centre — Cert ID
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(80, 76, 68)
  doc.text('CERTIFICATE ID', W / 2, 140, { align: 'center' })
  doc.setFont('courier', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(120, 115, 100)
  doc.text(cert.id, W / 2, 149, { align: 'center' })
  doc.setDrawColor(55, 50, 42)
  doc.setLineWidth(0.2)
  doc.line(W / 2 - 32, 153, W / 2 + 32, 153)

  // Right — Instructor
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(80, 76, 68)
  doc.text('INSTRUCTOR', W - 52, 140, { align: 'center' })

  if (coachSignatureUrl) {
    try {
      doc.addImage(coachSignatureUrl, 'PNG', W - 82, 128, 60, 18)
    } catch (_) {}
  } else {
    doc.setFont('times', 'bolditalic')
    doc.setFontSize(14)
    doc.setTextColor(...gold)
    doc.text(coachName || 'Instructor', W - 52, 149, { align: 'center' })
  }
  doc.setDrawColor(55, 50, 42)
  doc.setLineWidth(0.2)
  doc.line(W - 82, 153, W - 22, 153)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(80, 76, 68)
  doc.text(coachName || 'Instructor', W - 52, 158, { align: 'center' })

  // ── Footer watermark ──────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(44, 42, 38)
  doc.text(
    'Issued by Feyn · feyn.netlify.app · ' + cert.id,
    W / 2, H - 11, { align: 'center' }
  )

  // ── Save ──────────────────────────────────────────────────
  const filename = `Feyn-Certificate-${(cert.subjectName || 'Course').replace(/\s+/g, '-')}-${(cert.userName || 'Student').replace(/\s+/g, '-')}.pdf`
  doc.save(filename)
}
