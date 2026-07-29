import React, { useState, useMemo } from 'react'

export default function DynamicTable({
  data = [],
  searchFields = [], // Optional keys array. If empty, code will dynamically search all columns
  columns = [], // Structural configuration mapping headers and keys [{header, key, align}]
  registryLabel = 'Corporate Registry',
  footerLabel = 'Core Ledger Alignment Secure',
  footerMeta = 'Registry System Integrated',
}) {
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

        {/* 🛠️ Modern Filtration Control Panel Block (Fixed Contrast/Readability) */}
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
                  className={`sticky top-0 z-10 bg-red-600 px-6 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
            {filteredData.length > 0 ? (
              filteredData.map((row, rowIdx) => (
                <tr key={row.id || rowIdx} className="hover:bg-gray-50/50 transition-colors">
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={`px-6 py-3.5 whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                    >
                      {/* Execute custom render functions per column context block */}
                      {col.render ? col.render(row) : renderCellValue(row[col.key])}
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
