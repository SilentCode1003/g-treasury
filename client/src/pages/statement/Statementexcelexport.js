import XLSX from 'xlsx-js-style'
import { formatDecimalValue, buildContactLine, getExportCellValue } from './statementFormatters'

// Builds and downloads an .xlsx replica matching the PDF style:
// Centered grid columns, visible black borders, and clean layout structures.
export const exportStatementToExcel = ({ columns, rows, documentMeta = {}, statementId }) => {
  try {
    const from = documentMeta.fromCompany || {}
    const to = documentMeta.toCompany || {}
    const colCount = Math.max(columns.length, 4)

    const ws_data = []

    // Style Presets (Matching PDF color schemes)
    const fontNormal = { name: 'Arial', sz: 10 }
    const fontBold = { name: 'Arial', sz: 10, bold: true }
    const fontTitle = { name: 'Arial', sz: 11, bold: true }

    // Sharp black borders to make the table clearly structured and visible
    const borderThinSide = { style: 'thin', color: { rgb: '000000' } } 
    const borderTable = {
      top: borderThinSide,
      bottom: borderThinSide,
      left: borderThinSide,
      right: borderThinSide,
    }

    // ----- Helper to push custom styled rows -----
    const pushRow = (rowCells) => {
      ws_data.push(rowCells)
    }

    // ----- From Block -----
    pushRow([
      { v: 'From:', t: 's', s: { font: fontBold } },
      { v: from.name || '—', t: 's', s: { font: fontBold } },
    ])
    if (from.address) pushRow([{}, { v: from.address, t: 's', s: { font: fontNormal } }])
    const fromContact = buildContactLine(from)
    if (fromContact) pushRow([{}, { v: fromContact, t: 's', s: { font: fontNormal } }])

    pushRow([]) // Spacer

    // ----- To Block & Date Area -----
    const toRowIndex = ws_data.length
    pushRow([
      { v: 'To:', t: 's', s: { font: fontBold } },
      { v: to.name || '—', t: 's', s: { font: fontBold } },
    ])
    if (to.address) pushRow([{}, { v: to.address, t: 's', s: { font: fontNormal } }])
    const toContact = buildContactLine(to)
    if (toContact) pushRow([{}, { v: toContact, t: 's', s: { font: fontNormal } }])

    // Fill structural padding spaces up to the Date placement slot
    while (ws_data[toRowIndex].length < colCount) {
      ws_data[toRowIndex].push({})
    }
    ws_data[toRowIndex][colCount - 2] = {
      v: 'DATE:',
      t: 's',
      s: { font: fontBold, alignment: { horizontal: 'right' } },
    }
    ws_data[toRowIndex][colCount - 1] = {
      v: documentMeta.date || '',
      t: 's',
      s: { font: fontNormal },
    }

    pushRow([]) // Spacer
    pushRow([]) // Spacer

    // ----- Center-Aligned Header Title Section -----
    const titleRowIndex = ws_data.length
    const titleCells = new Array(colCount).fill(null).map((_, i) => ({
      v: i === 0 ? (documentMeta.title || 'STATEMENT OF ACCOUNT').toUpperCase() : '',
      t: 's',
      s: {
        font: fontTitle,
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          bottom: { style: 'double', color: { rgb: '000000' } },
          top: { style: 'double', color: { rgb: '000000' } },
        },
      },
    }))
    pushRow(titleCells)

    pushRow([]) // Spacer before main Table

    // ----- Table Headers -----
    const tableHeaderRowIndex = ws_data.length
    const tableHeaderCells = columns.map((c) => ({
      v: (c.header || c.key).toUpperCase(),
      t: 's',
      s: {
        font: fontBold,
        fill: { fgColor: { rgb: 'F1F5F9' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: borderTable,
      },
    }))
    pushRow(tableHeaderCells)

    // ----- Table Body Rows -----
    const tableBodyStartRowIndex = ws_data.length
    rows.forEach((r, rowIdx) => {
      const dataRowCells = columns.map((c) => {
        let val = getExportCellValue(r, c, rowIdx)
        if (val === true) val = 'X'
        if (val === false || val === null || val === undefined) val = ''

        return {
          v: val,
          t: typeof val === 'number' ? 'n' : 's',
          s: {
            font: fontNormal,
            alignment: { horizontal: 'center', vertical: 'center' },
            border: borderTable,
          },
        }
      })
      pushRow(dataRowCells)
    })
    const tableBodyEndRowIndex = ws_data.length - 1

    pushRow([]) // Spacer

    // ----- Totals Section -----
    const totalsStartRowIndex = ws_data.length
    const buildTotalsRow = (label, value, isBold = false) => {
      const row = new Array(colCount).fill(null).map(() => ({}))

      row[colCount - 2] = {
        v: label,
        t: 's',
        s: {
          font: isBold ? fontBold : fontNormal,
          alignment: { horizontal: 'left', vertical: 'center' },
          border: borderTable,
          fill: isBold ? { fgColor: { rgb: 'F8FAFC' } } : undefined,
        },
      }
      row[colCount - 1] = {
        v: value,
        t: 's',
        s: {
          font: isBold ? fontBold : fontNormal,
          alignment: { horizontal: 'right', vertical: 'center' },
          border: borderTable,
          fill: isBold ? { fgColor: { rgb: 'F8FAFC' } } : undefined,
        },
      }
      return row
    }

    pushRow(buildTotalsRow('Sub-Total', formatDecimalValue(documentMeta.subTotal)))
    pushRow(buildTotalsRow('12% VAT', formatDecimalValue(documentMeta.vat)))
    pushRow(buildTotalsRow('Total Sales', formatDecimalValue(documentMeta.total), true))
    const totalsEndRowIndex = ws_data.length - 1

    pushRow([])
    pushRow([])

    // ----- Signature Labels Area -----
    const signatureRow = new Array(colCount).fill(null).map(() => ({}))
    signatureRow[0] = { v: 'Prepared By:', t: 's', s: { font: fontNormal } }

    const targetRecIndex = Math.min(colCount - 2, 4)
    signatureRow[targetRecIndex] = { v: 'Received By:', t: 's', s: { font: fontNormal } }
    pushRow(signatureRow)

    // ----- Signature Underline Row -----
    const lineRow = new Array(colCount).fill(null).map(() => ({}))
    const borderUnderline = { bottom: { style: 'thin', color: { rgb: '000000' } } }

    lineRow[0] = { v: '', t: 's', s: { border: borderUnderline } }
    lineRow[1] = { v: '', t: 's', s: { border: borderUnderline } }

    lineRow[targetRecIndex] = { v: '', t: 's', s: { border: borderUnderline } }
    if (targetRecIndex + 1 < colCount) {
      lineRow[targetRecIndex + 1] = { v: '', t: 's', s: { border: borderUnderline } }
    }
    pushRow(lineRow)

    // --- Build Sheet Map ---
    const ws = {}

    ws_data.forEach((row, rIdx) => {
      const isInsideTable = rIdx >= tableHeaderRowIndex && rIdx <= tableBodyEndRowIndex
      const isInsideTotals = rIdx >= totalsStartRowIndex && rIdx <= totalsEndRowIndex

      for (let cIdx = 0; cIdx < colCount; cIdx++) {
        const cell = row[cIdx] || {}
        const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx })

        if (cell.v !== undefined) {
          ws[cellRef] = {
            v: cell.v,
            t: cell.t || 's',
            s: cell.s || {},
          }
        } else if (isInsideTable) {
          ws[cellRef] = {
            v: '',
            t: 's',
            s: {
              border: borderTable,
              font: fontNormal,
            },
          }
        } else if (isInsideTotals) {
          ws[cellRef] = {
            v: '',
            t: 's',
            s: {
              border: cIdx >= colCount - 2 ? borderTable : undefined,
            },
          }
        } else if (cell.s) {
          ws[cellRef] = {
            v: '',
            t: 's',
            s: cell.s,
          }
        }
      }
    })

    const maxRow = ws_data.length - 1
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: colCount - 1 } })

    ws['!merges'] = [{ s: { r: titleRowIndex, c: 0 }, e: { r: titleRowIndex, c: colCount - 1 } }]

    ws['!cols'] = new Array(colCount).fill({ wch: 16 })
    ws['!rows'] = []
    ws['!rows'][titleRowIndex] = { hpt: 26 }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Statement')

    const filename = `statement-${statementId || 'export'}.xlsx`
    XLSX.writeFile(wb, filename)
  } catch (err) {
    // console.error('Export Excel failed', err)
  }
}