import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatDecimalValue, buildContactLine, getExportCellValue } from './statementFormatters'
import logo from '../../../assets/logo.png'

// Builds and downloads a .pdf replica of the paper Statement of Account:
// From block → To block → Date → centered Title (with rules) → data table
// → totals box → signature lines.
export const exportStatementToPdf = ({ columns, rows, documentMeta = {}, statementId }) => {
  try {
    const from = documentMeta.fromCompany || {}
    const to = documentMeta.toCompany || {}

    const shortBondWidth = 936
    const shortBondHeight = 612
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: [shortBondWidth, shortBondHeight],
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const marginLeft = 28
    const marginRight = pageWidth - marginLeft
    let cursorY = 40

    // ----- Add Logo -----
    const logoSize = 75
    const logoHeight = 65
    const logoAreaPadding = 15
    try {
      doc.addImage(logo, 'PNG', marginLeft, 12, logoSize, logoHeight)
      cursorY = 40
    } catch (err) {
      // Fallback if logo fails to load
    }

    const textBlack = [0, 0, 0]
    const textDark = [30, 41, 59]
    const textMuted = [100, 116, 139]
    const tableHeaderBg = [241, 245, 249]
    const borderLight = [203, 213, 225]

    // ----- Date Block (Top Right) -----
    if (documentMeta.date) {
      doc.setFontSize(9)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(textDark[0], textDark[1], textDark[2])
      doc.text('DATE:', marginRight - 140, cursorY)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])
      doc.text(String(documentMeta.date), marginRight - 100, cursorY)
    }

    const drawCompanyBlock = (label, companyData, leftPos = marginLeft) => {
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(textBlack[0], textBlack[1], textBlack[2])
      doc.text(label, leftPos, cursorY)

      const textLeft = leftPos + 42
      doc.setFont(undefined, 'bold')
      doc.text(companyData.name || '—', textLeft, cursorY)

      doc.setFontSize(9)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(textBlack[0], textBlack[1], textBlack[2])

      let lineY = cursorY
      if (companyData.address) {
        lineY += 14
        doc.text(companyData.address, textLeft, lineY)
      }
      const contact = buildContactLine(companyData)
      if (contact) {
        lineY += 14
        doc.text(contact, textLeft, lineY)
      }

      return lineY
    }

    // ----- From Block -----
    const fromLeftPos = marginLeft + logoSize + logoAreaPadding
    const endOfFromY = drawCompanyBlock('From:', from, fromLeftPos)
    cursorY = endOfFromY + 22

    // ----- To Block -----
    const endOfToY = drawCompanyBlock('To:', to, fromLeftPos)
    cursorY = endOfToY + 25

    // ----- Title Block Dividers & Text -----
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2])
    doc.setLineWidth(1)

    doc.line(marginLeft, cursorY, marginRight, cursorY)

    cursorY += 16
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(textDark[0], textDark[1], textDark[2])
    doc.text((documentMeta.title || 'STATEMENT OF ACCOUNT').toUpperCase(), pageWidth / 2, cursorY, {
      align: 'center',
    })

    cursorY += 8
    doc.line(marginLeft, cursorY, marginRight, cursorY)

    cursorY += 16

    // ----- Main Data Table -----
    const head = [columns.map((c) => (c.header || c.key).toUpperCase())]

    const body = rows.map((r, rowIdx) =>
      columns.map((c) => {
        const val = getExportCellValue(r, c, rowIdx)
        if (val === true) return 'X'
        if (val === false) return ''
        return val
      }),
    )

    const availableWidth = pageWidth - marginLeft * 2

    // Dynamic Font & Padding Adjustment: Shrink text as columns scale up to fit constraints
    const totalCols = columns.length
    let computedFontSize = 8
    let computedPadding = 6

    if (totalCols > 12) {
      computedFontSize = 6.5
      computedPadding = 3.5
    } else if (totalCols > 8) {
      computedFontSize = 7.5
      computedPadding = 4.5
    }

    doc.autoTable({
      head,
      body,
      startY: cursorY,
      theme: 'grid',
      margin: { left: marginLeft, right: marginLeft },
      tableWidth: availableWidth, // Strictly bound table width to paper content limits
      styles: {
        fontSize: computedFontSize,
        cellPadding: computedPadding,
        overflow: 'linebreak',
        textColor: textDark,
        borderColor: borderLight,
        lineWidth: 0.5,
        halign: 'center',
        valign: 'middle',
      },
      headStyles: {
        fillColor: tableHeaderBg,
        textColor: textDark,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
      },
      // Let autoTable calculate widths proportionally to fit perfectly inside page boundaries
      columnStyles: {},
    })

    const afterTableY = (doc.lastAutoTable?.finalY || cursorY) + 15

    // ----- Totals Section -----
    const totalsWidth = 260
    const totalsX = pageWidth - marginLeft - totalsWidth

    doc.autoTable({
      startY: afterTableY,
      margin: { left: totalsX },
      tableWidth: totalsWidth,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 6,
        borderColor: borderLight,
        lineWidth: 1,
        textColor: textDark,
        valign: 'middle',
      },
      body: [
        [
          { content: 'Sub-Total', styles: { fontStyle: 'normal', halign: 'left' } },
          { content: formatDecimalValue(documentMeta.subTotal), styles: { halign: 'right' } },
        ],
        [
          { content: '12% VAT', styles: { fontStyle: 'normal', halign: 'left' } },
          { content: formatDecimalValue(documentMeta.vat), styles: { halign: 'right' } },
        ],
        [
          { content: 'Total Sales', styles: { fontStyle: 'bold', halign: 'left' } },
          {
            content: formatDecimalValue(documentMeta.total),
            styles: { fontStyle: 'bold', halign: 'right' },
          },
        ],
      ],
    })

    const finalYAfterTotals = doc.lastAutoTable?.finalY || afterTableY

    // ----- Signature Lines -----
    const signY = finalYAfterTotals + 35
    doc.setFont(undefined, 'normal')
    doc.setFontSize(9)
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2])

    doc.text('Prepared By:', marginLeft, signY)
    doc.text('Received By:', marginLeft + 260, signY)

    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2])
    doc.line(marginLeft, signY + 14, marginLeft + 180, signY + 14)
    doc.line(marginLeft + 260, signY + 14, marginLeft + 440, signY + 14)

    const filename = `statement-${statementId || 'export'}.pdf`
    doc.save(filename)
  } catch (err) {
    // console.error('Export PDF failed', err)
  }
}
