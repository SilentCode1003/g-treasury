import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatDecimalValue, buildContactLine, getExportCellValue, formatDateLabel, expandRowsForExport, hasPartsColumns, getPartsColumnKeys } from './Statementformatters'
import logo from '../../../assets/logo.png'

// Builds and returns a .pdf replica of the paper Statement of Account:
// From block → To block → Date → centered Title (with rules) → data table
// → totals box → signature lines.
export const exportStatementToPdf = ({ columns, rows, documentMeta = {}, statementId, totals, showSubtotal = true, showVat = true, showTotal = true }) => {
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
      doc.text(String(formatDateLabel(documentMeta.date) || documentMeta.date), marginRight - 100, cursorY)
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

    // For PDF with parts, we need to create a different structure with rowSpan
    const partsKeys = hasPartsColumns(columns) ? getPartsColumnKeys(columns) : null
    let body = []
    let rowSpans = [] // Track rowSpan for each cell
    
    if (partsKeys) {
      // Special handling for parts format with rowSpan
      let currentRowIndex = 0
      rows.forEach((r) => {
        const parts = r.parts || []
        
        if (parts.length === 0) {
          // No parts, just add the main row
          const rowValues = columns.map((c) => {
            const val = getExportCellValue(r, c, currentRowIndex, false)
            if (val === true) return 'X'
            if (val === false) return ''
            return val
          })
          body.push(rowValues)
          rowSpans.push(columns.map(() => 1))
          currentRowIndex++
        } else {
          // Compute total invoice amount for this row
          const totalInvoiceAmount = parts.reduce((sum, part) => {
            return sum + (part.values?.subtotal || 0)
          }, 0)
          
          // Add all parts as separate rows with rowSpan for main columns
          parts.forEach((part, partIdx) => {
            const rowValues = columns.map((c) => {
              // For main columns (non-parts), only show on first row
              const isPartsColumn = c.key === partsKeys.partsDescription || 
                                    c.key === partsKeys.partsQty || 
                                    c.key === partsKeys.price || 
                                    c.key === partsKeys.subtotal
              
              if (!isPartsColumn) {
                // Main columns - only show on first row
                if (partIdx === 0) {
                  const val = getExportCellValue(r, c, currentRowIndex, false)
                  if (val === true) return 'X'
                  if (val === false) return ''
                  return val
                }
                return '' // Empty for subsequent rows
              } else {
                // Parts columns - show part data
                const partRow = { values: part.values }
                const val = getExportCellValue(partRow, c, currentRowIndex, true)
                if (val === true) return 'X'
                if (val === false) return ''
                return val
              }
            })
            
            // Set TOTAL INVOICE AMOUNT on first row
            if (partIdx === 0 && partsKeys.totalInvoiceAmount) {
              const totalColIndex = columns.findIndex(c => c.key === partsKeys.totalInvoiceAmount)
              if (totalColIndex >= 0) {
                rowValues[totalColIndex] = formatDecimalValue(totalInvoiceAmount)
              }
            }
            
            body.push(rowValues)
            
            // Track rowSpan for main columns on first row
            if (partIdx === 0) {
              const rowSpanRow = columns.map((c) => {
                const isPartsColumn = c.key === partsKeys.partsDescription || 
                                      c.key === partsKeys.partsQty || 
                                      c.key === partsKeys.price || 
                                      c.key === partsKeys.subtotal
                return isPartsColumn ? 1 : parts.length
              })
              rowSpans.push(rowSpanRow)
            } else {
              rowSpans.push(columns.map(() => 1))
            }
            currentRowIndex++
          })
        }
      })
    } else {
      // Regular format - use standard expansion
      const expandedRows = expandRowsForExport(rows, columns)
      body = expandedRows.map((r, rowIdx) =>
        columns.map((c) => {
          const val = getExportCellValue(r, c, rowIdx, r.isPartRow)
          if (val === true) return 'X'
          if (val === false) return ''
          return val
        }),
      )
      rowSpans = body.map(() => columns.map(() => 1))
    }

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
      // Apply rowSpan for parts format
      didParseCell: (data) => {
        if (partsKeys && data.section === 'body') {
          const rowIndex = data.row.index
          const colIndex = data.column.index
          if (rowSpans[rowIndex] && rowSpans[rowIndex][colIndex] > 1) {
            data.cell.rowSpan = rowSpans[rowIndex][colIndex]
          }
        }
      },
      // Let autoTable calculate widths proportionally to fit perfectly inside page boundaries
      columnStyles: {},
    })

    const afterTableY = (doc.lastAutoTable?.finalY || cursorY) + 15

    // ----- Totals Section -----
    const totalsWidth = 260
    const totalsX = pageWidth - marginLeft - totalsWidth

    // Build totals body based on show flags
    const totalsBody = []
    if (showSubtotal) {
      totalsBody.push([
        { content: 'Sub-Total', styles: { fontStyle: 'normal', halign: 'left' } },
        { content: formatDecimalValue(totals?.subTotal || documentMeta.subTotal), styles: { halign: 'right' } },
      ])
    }
    if (showVat) {
      totalsBody.push([
        { content: '12% VAT', styles: { fontStyle: 'normal', halign: 'left' } },
        { content: formatDecimalValue(totals?.vat || documentMeta.vat), styles: { halign: 'right' } },
      ])
    }
    if (showTotal) {
      // If subtotal is hidden, show subtotal value as Total Sales
      const totalValue = !showSubtotal 
        ? (totals?.subTotal || documentMeta.subTotal)
        : (totals?.total || documentMeta.total)
      
      totalsBody.push([
        { content: 'Total Sales', styles: { fontStyle: 'bold', halign: 'left' } },
        {
          content: formatDecimalValue(totalValue),
          styles: { fontStyle: 'bold', halign: 'right' },
        },
      ])
    }

    // Only show totals box if at least one total is visible
    if (totalsBody.length > 0) {
      doc.autoTable({
        startY: afterTableY + 10,
        margin: { left: marginRight - 200, top: 0 },
        tableWidth: 180,
        styles: {
          fontSize: 9,
          cellPadding: 6,
          borderColor: borderLight,
          lineWidth: 1,
          textColor: textDark,
          valign: 'middle',
        },
        body: totalsBody,
      })
    }

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
    return doc.output('blob')
  } catch (err) {
    console.error('Export PDF failed', err)
    throw err
  }
}
