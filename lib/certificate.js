// ============================================================
// CERTIFICATE GENERATOR
// Renders a styled certificate to a Canvas, downloads as PDF
// via jsPDF (loaded dynamically — no install needed at build)
// ============================================================

export async function downloadCertificate({ cert, coachName, coachSignatureUrl }) {
  // Dynamically import jsPDF (client-only)
  const { jsPDF } = await import('jspdf')

  const W = 297  // A4 landscape mm
  const H = 210

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ── Background ────────────────────────────────────────────
  // Deep dark background
  doc.setFillColor(13, 13, 13)
  doc.rect(0, 0, W, H, 'F')

  // Gold border frame — outer
  doc.setDrawColor(200, 169, 110)
  doc.setLineWidth(0.6)
  doc.rect(8, 8, W - 16, H - 16)

  // Gold border frame — inner thin
  doc.setLineWidth(0.2)
  doc.rect(11, 11, W - 22, H - 22)

  // Corner ornaments (simple cross marks)
  const corners = [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]]
  doc.setDrawColor(200, 169, 110)
  doc.setLineWidth(0.4)
  corners.forEach(([x, y]) => {
    doc.line(x - 4, y, x + 4, y)
    doc.line(x, y - 4, x, y + 4)
  })

  // ── Header rule ───────────────────────────────────────────
  doc.setDrawColor(200, 169, 110)
  doc.setLineWidth(0.3)
  doc.line(W / 2 - 40, 28, W / 2 + 40, 28)

  // ── Platform name ─────────────────────────────────────────
  doc.setFont('times', 'italic')
  doc.setFontSize(10)
  doc.setTextColor(200, 169, 110)
  doc.text('Feynman Files', W / 2, 24, { align: 'center' })

  // ── Certificate title ─────────────────────────────────────
  doc.setFont('times', 'normal')
  doc.setFontSize(28)
  doc.setTextColor(232, 227, 216)
  doc.text('Certificate of Completion', W / 2, 50, { align: 'center' })

  // ── Subtitle rule ─────────────────────────────────────────
  doc.setDrawColor(80, 70, 55)
  doc.setLineWidth(0.2)
  doc.line(W / 2 - 60, 56, W / 2 + 60, 56)

  // ── "This is to certify that" ─────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(154, 148, 136)
  doc.text('This is to certify that', W / 2, 68, { align: 'center' })

  // ── Student name ──────────────────────────────────────────
  doc.setFont('times', 'bolditalic')
  doc.setFontSize(32)
  doc.setTextColor(232, 227, 216)
  doc.text(cert.userName || 'Student', W / 2, 84, { align: 'center' })

  // Name underline
  const nameWidth = doc.getTextWidth(cert.userName || 'Student')
  doc.setDrawColor(200, 169, 110)
  doc.setLineWidth(0.3)
  doc.line(W / 2 - nameWidth / 2, 87, W / 2 + nameWidth / 2, 87)

  // ── "has successfully completed" ─────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(154, 148, 136)
  doc.text('has successfully completed', W / 2, 97, { align: 'center' })

  // ── Course name ───────────────────────────────────────────
  doc.setFont('times', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(200, 169, 110)
  const courseLine = `${cert.programName} — ${cert.subjectName}`
  doc.text(courseLine, W / 2, 110, { align: 'center' })

  // ── Divider ───────────────────────────────────────────────
  doc.setDrawColor(40, 40, 40)
  doc.setLineWidth(0.3)
  doc.line(30, 125, W - 30, 125)

  // ── Bottom section: date | cert ID | coach ────────────────
  const dateStr = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  // Left — issue date
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(92, 88, 82)
  doc.text('DATE OF ISSUE', 50, 140, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(200, 200, 190)
  doc.text(dateStr, 50, 148, { align: 'center' })
  doc.setDrawColor(60, 60, 55)
  doc.setLineWidth(0.2)
  doc.line(20, 153, 80, 153)

  // Center — cert ID
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(92, 88, 82)
  doc.text('CERTIFICATE ID', W / 2, 140, { align: 'center' })
  doc.setFont('courier', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(154, 148, 136)
  doc.text(cert.id, W / 2, 148, { align: 'center' })
  doc.setDrawColor(60, 60, 55)
  doc.setLineWidth(0.2)
  doc.line(W / 2 - 30, 153, W / 2 + 30, 153)

  // Right — coach name + signature
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(92, 88, 82)
  doc.text('INSTRUCTOR', W - 50, 140, { align: 'center' })

  if (coachSignatureUrl) {
    try {
      // If a signature image is available, embed it
      doc.addImage(coachSignatureUrl, 'PNG', W - 80, 128, 60, 18)
    } catch (_) {}
  } else {
    // Stylised text signature fallback
    doc.setFont('times', 'bolditalic')
    doc.setFontSize(14)
    doc.setTextColor(200, 169, 110)
    doc.text(coachName || 'Instructor', W - 50, 148, { align: 'center' })
  }

  doc.setDrawColor(60, 60, 55)
  doc.setLineWidth(0.2)
  doc.line(W - 80, 153, W - 20, 153)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(92, 88, 82)
  doc.text(coachName || 'Instructor', W - 50, 158, { align: 'center' })

  // ── Footer watermark ──────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(50, 48, 44)
  doc.text(
    'Verify at feyn.netlify.app · ' + cert.id,
    W / 2, H - 12, { align: 'center' }
  )

  // ── Save ──────────────────────────────────────────────────
  const filename = `Feynman-Certificate-${cert.subjectName.replace(/\s+/g, '-')}-${cert.userName?.replace(/\s+/g, '-') || 'Student'}.pdf`
  doc.save(filename)
}
