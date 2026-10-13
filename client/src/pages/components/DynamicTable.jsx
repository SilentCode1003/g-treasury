import React, { useState, useMemo } from 'react'

/**
 * Column config:
 * {
 *   header: 'Title',
 *   key: 'title',
 *   align: 'left' | 'center' | 'right',
 *   overflow: 'wrap' | 'clamp' | 'truncate',  // NEW - how long text is handled (default: 'wrap')
 *   maxWidth: '20rem',                        // NEW - optional max width of the cell text
 *   noWrap: true,                          // NEW - keep on one line (auto-on for id/date/total/amount keys)
 *   minWidth: '18rem',                        // NEW - optional min column width (good for Title)
 *   lines: 2,                                 // NEW - used when overflow === 'clamp'
 *   render: (row) => <JSX />,                 // optional custom renderer (bypasses overflow handling)
 * }
 */

// Tailwind needs full class names to exist in the source, so map line counts explicitly
const CLAMP_CLASSES = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
}

// Forces every nested element inside a cell to wrap instead of truncating, even when a
// column's custom `render` uses `truncate`, `text-ellipsis`, `max-w-*` or `line-clamp-*`.
const WRAP_OVERRIDE =
  '[&_*]:!whitespace-normal [&_*]:!overflow-visible [&_*]:![text-overflow:clip] [&_*]:!max-w-none [&_*]:![-webkit-line-clamp:unset] [&_*]:!break-words'

// Actions column: fixed width, always visible (no hide/show animation)
const ACTIONS_STYLE = { width: '120px', minWidth: '120px', maxWidth: '120px' }

export default function DynamicTable({
  data = [],
  searchFields = [], // Optional keys array. If empty, code will dynamically search all columns
  columns = [], // Structural configuration mapping headers and keys [{header, key, align}]
  registryLabel = 'Corporate Registry',
  footerLabel = 'Core Ledger Alignment Secure',
  footerMeta = 'Registry System Integrated',
  onRowClick = null,
  selectedRowId = null,
  onRowHover = null,
  onRowLeave = null,
  wrapCells = true, // true: long text expands the row height instead of showing "..."
}) {
  // Short, fixed-format columns (dates, totals, ids) should never wrap onto a second line.
  // Set `noWrap: true/false` on a column to override this guess.
  const isNoWrap = (col) =>
    col.noWrap !== undefined ? col.noWrap : /(^id$|date|total|amount)/i.test(col.key || '')

  // Local states managing user interface controls
  const [localSearchQuery, setLocalSearchQuery] = useState('')
  const [selectedColumnKey, setSelectedColumnKey] = useState('All')
  const [selectedColumnValue, setSelectedColumnValue] = useState('All')

  // 1. Dynamic Extraction: Pull out unique values for the selected column
  const uniqueColumnValues = useMemo(() => {
    if (!selectedColumnKey || selectedColumnKey === 'All') return []

    const values = data
      .map((item) => {
        const val = item[selectedColumnKey]
        return val !== undefined && val !== null ? String(val) : ''
      })
      .filter(Boolean)

    // Remove duplicates using Set array conversion
    return [...new Set(values)].sort()
  }, [data, selectedColumnKey])

  // Handle parent state resets if user switches columns midpoint
  const handleColumnKeyChange = (e) => {
    setSelectedColumnKey(e.target.value)
    setSelectedColumnValue('All') // Reset inner value lookup
  }

  const renderCellValue = (value) => {
    if (value === null || value === undefined) return '—'
    const text = String(value)
    const normalized = text.trim().toLowerCase()

    if (normalized.includes('inactive')) {
      return (
        <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-700">
          Inactive
        </span>
      )
    }

    if (normalized.includes('active')) {
      return (
        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
          Active
        </span>
      )
    }

    return text
  }

  // Wraps the default cell output so long text is handled per column config,
  // and the full value is always available as a hover tooltip.
  const renderDefaultCell = (col, row) => {
    const rawValue = row[col.key]
    const content = renderCellValue(rawValue)

    // Badges / non-text output (e.g. Active / Inactive pills) are returned as-is
    if (typeof content !== 'string') return content

    const overflow = col.overflow || 'wrap'
    const style = col.maxWidth ? { maxWidth: col.maxWidth } : undefined

    if (overflow === 'truncate') {
      return (
        <span title={content} className="block truncate" style={{ maxWidth: col.maxWidth || '20rem' }}>
          {content}
        </span>
      )
    }

    if (overflow === 'clamp') {
      const clampClass = CLAMP_CLASSES[col.lines] || CLAMP_CLASSES[2]
      return (
        <span title={content} className={`block break-words ${clampClass}`} style={style}>
          {content}
        </span>
      )
    }

    // 'wrap' (default): show the whole text, wrapping onto as many lines as needed
    return (
      <span title={content} className="block whitespace-normal break-words" style={style}>
        {content}
      </span>
    )
  }

  // 2. Refined Calculation Loop filtering table datasets matching both selection options
  const filteredData = useMemo(() => {
    // Comparator: numeric id when possible, fallback to string compare
    const compareByIdDesc = (a, b) => {
      const ai = a && a.id !== undefined && a.id !== null ? Number(a.id) : NaN
      const bi = b && b.id !== undefined && b.id !== null ? Number(b.id) : NaN
      if (!isNaN(ai) && !isNaN(bi)) return bi - ai
      const as = a && a.id ? String(a.id) : ''
      const bs = b && b.id ? String(b.id) : ''
      return bs.localeCompare(as)
    }

    const results = data.filter((item) => {
      // Step A: Handle Local Text Field Queries
      const activeSearchFields =
        searchFields.length > 0 ? searchFields : columns.map((c) => c.key).filter(Boolean)
      const matchesSearch =
        activeSearchFields.length === 0 ||
        activeSearchFields.some((field) => {
          const val = item[field]
          return val ? String(val).toLowerCase().includes(localSearchQuery.toLowerCase()) : false
        })

      // Step B: Handle Dynamic Column Match Filtering
      let matchesColumnFilter = true
      if (selectedColumnKey !== 'All' && selectedColumnValue !== 'All') {
        const itemValue = item[selectedColumnKey]
        matchesColumnFilter =
          itemValue !== undefined && itemValue !== null && String(itemValue) === selectedColumnValue
      }

      return matchesSearch && matchesColumnFilter
    })

    // Always present data sorted by `id` in descending order
    return results.slice().sort(compareByIdDesc)
  }, [data, localSearchQuery, selectedColumnKey, selectedColumnValue, searchFields, columns])

  return (
    <div className="h-auto lg:flex-1 lg:min-h-0 flex flex-col rounded border border-gray-200 bg-white shadow-sm">
      {/* Controls Sub-Header info readout */}
      <div className="flex flex-col gap-4 bg-gray-900 px-6 py-4 sm:flex-row sm:items-center sm:justify-between lg:shrink-0">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-100">
            {registryLabel}
          </h3>
          <p className="text-[11px] text-gray-400">
            Showing {filteredData.length} of {data.length} registered entries
          </p>
        </div>

        {/* Modern Filtration Control Panel Block (Fixed Contrast/Readability) */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* White High-Contrast Text Input Search Bar */}
          <input
            type="text"
            placeholder="Search matching entries..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="w-full sm:w-48 bg-white text-xs text-gray-800 placeholder-gray-500 rounded border border-gray-300 px-3 py-1.5 font-medium shadow-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
          />

          {/* Select Component 1: Chooses column targeting option */}
          <select
            value={selectedColumnKey}
            onChange={handleColumnKeyChange}
            className="bg-white text-xs text-gray-800 rounded border border-gray-300 px-2 py-1.5 font-medium shadow-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors cursor-pointer"
          >
            <option value="All">Filter By Column...</option>
            {columns.map(
              (col, index) =>
                col.key && (
                  <option key={index} value={col.key}>
                    {col.header}
                  </option>
                ),
            )}
          </select>

          {/* Select Component 2: Unique value targeting dropdown */}
          <select
            value={selectedColumnValue}
            onChange={(e) => setSelectedColumnValue(e.target.value)}
            disabled={selectedColumnKey === 'All'}
            className="bg-white text-xs text-gray-800 rounded border border-gray-300 px-2 py-1.5 font-medium shadow-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors cursor-pointer disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed"
          >
            <option value="All">All Unique Values</option>
            {uniqueColumnValues.map((value, index) => (
              <option key={index} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Container
        - Mobile: Natural vertical fluid layout, horizontal side-scroll enabled
        - Desktop (lg): Fixed locked bounding box, inside vertical row scrolling
      */}
      <div className="overflow-x-auto lg:flex-1 lg:overflow-y-auto">
        <table className="w-full text-center border-collapse relative">
          <thead>
            <tr className="border-b border-gray-100 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`sticky top-0 z-10 bg-red-600 px-6 py-3 whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={
                    col.key === 'actions'
                      ? ACTIONS_STYLE
                      : col.minWidth
                        ? { minWidth: col.minWidth }
                        : {}
                  }
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
            {filteredData.length > 0 ? (
              filteredData.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  onClick={() => onRowClick && onRowClick(row)}
                  onMouseEnter={() => {
                    onRowHover && onRowHover(row.id)
                  }}
                  onMouseLeave={() => {
                    onRowLeave && onRowLeave()
                  }}
                  className={`${
                    onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
                  } transition-colors ${
                    selectedRowId && row.id === selectedRowId ? 'bg-red-50' : ''
                  }`}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-6 py-3.5 whitespace-normal align-middle ${col.key === 'actions' ? '' : isNoWrap(col) ? '!whitespace-nowrap' : wrapCells ? WRAP_OVERRIDE : ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                      style={
                        col.key === 'actions'
                          ? ACTIONS_STYLE
                          : col.minWidth
                            ? { minWidth: col.minWidth }
                            : {}
                      }
                    >
                      {/* Execute custom render functions per column context block */}
                      {col.render ? col.render(row) : renderDefaultCell(col, row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-xs font-medium text-gray-400 uppercase tracking-widest"
                >
                  No tracking records discovered matching selection filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Absolute Bottom Ledger Status Footer */}
      <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/30 flex items-center justify-between text-[11px] text-gray-400 lg:shrink-0">
        <span>{footerLabel}</span>
        <span className="font-mono text-[10px]">{footerMeta}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------
 * Example usage (put this in the page that renders the table)
 *
 * IMPORTANT: your Title column currently has a custom `render` with a
 * `truncate` class. That is what produces the "..." in your screenshot.
 * Either delete `render` so the new `overflow` option takes over (A),
 * or edit the render itself (B).
 *
 * const columns = [
 *   { header: 'ID', key: 'id', align: 'center' },
 *
 *   // A) Full text, wraps onto multiple lines (no dots)
 *   { header: 'Title', key: 'title', align: 'left', overflow: 'wrap', maxWidth: '24rem' },
 *
 *   // A2) Max 2 lines, then dots, full text on hover
 *   // { header: 'Title', key: 'title', align: 'left', overflow: 'clamp', lines: 2, maxWidth: '24rem' },
 *
 *   // B) Custom render with wrapping instead of truncate
 *   // {
 *   //   header: 'Title',
 *   //   key: 'title',
 *   //   align: 'left',
 *   //   render: (row) => (
 *   //     <span title={row.title} className="block max-w-sm whitespace-normal break-words font-bold text-gray-900">
 *   //       {row.title}
 *   //     </span>
 *   //   ),
 *   // },
 *
 *   { header: 'Company From', key: 'companyFrom', align: 'left', overflow: 'truncate' },
 *   { header: 'Company To', key: 'companyTo', align: 'left', overflow: 'truncate' },
 *   { header: 'Date', key: 'date', align: 'left' },
 *   { header: 'Prepared By', key: 'preparedBy', align: 'left' },
 *   { header: 'Total', key: 'total', align: 'right' },
 *   { header: 'Actions', key: 'actions', align: 'center', render: (row) => <ActionButtons row={row} /> },
 * ]
 * ------------------------------------------------------------------ */