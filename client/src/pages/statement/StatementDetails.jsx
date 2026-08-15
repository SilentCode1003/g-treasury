import React, { useEffect, useMemo, useRef, useState, useImperativeHandle } from 'react'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { useLocation, useMatch, useNavigate } from '@tanstack/react-router'
import Layout from '../components/Layout'
import DynamicToast from '../components/DynamicToast'
import { apiClient } from '../../api/axios'

import {
  formatDateLabel,
  formatCurrency,
  normalizeServiceId,
  formatDecimalValue,
  isSalesColumn,
  isAdditionalSalesColumn,
  isTotalSalesColumn,
  isDateColumn,
  isQuantityColumn,
  parseDecimalInput,
  formatNumberInput,
  formatQuantityInput,
  isNumericColumn,
  getComputedSalesTotal,
  getComputedVatValue,
  isStoreNameColumn,
  isStoreNumberColumn,
  isRowNumberColumn,
  hasPartsColumns,
  getPartsColumnKeys,
} from './Statementformatters'
import { exportStatementToExcel } from './Statementexcelexport'
import { exportStatementToPdf } from './Statementpdfexport'

// Add CSS keyframes for fade animation
const fadeInKeyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .add-part-row {
    opacity: 0;
    transform: translateY(-10px);
    pointer-events: none;
  }
  
  .add-part-row.visible {
    animation: slideIn 0.3s ease-in-out forwards;
  }
  
  .add-part-row.hiding {
    animation: slideOut 0.3s ease-in-out forwards;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
  }
  
  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
    to {
      opacity: 0;
      transform: translateY(-10px);
      pointer-events: none;
    }
  }
`

const normalizeHeaderKey = (value = '') =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

const MaintenanceTable = ({ statementId, documentMeta, onSave, initialRows, saving, onTotalsChange }) => {
  // Inject CSS keyframes for fade animation
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = fadeInKeyframes
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const [rows, setRows] = useState(() => {
    if (Array.isArray(initialRows) && initialRows.length > 0) {
      return initialRows.map((r, i) => ({
        id: r.id || `row-${i + 1}`,
        values: r.values || r,
      }))
    }
    return [{ id: 'row-1', values: { area: '', noOfStore: '', pricePerStore: 350, totalAmount: 0, serviceType: 'MAINTENANCE', workDone: 'REPAIR AND MAINTENANCE' } }]
  })
  const [cities, setCities] = useState([])
  const [loadingCities, setLoadingCities] = useState(true)
  const [activeAreaDropdown, setActiveAreaDropdown] = useState(null)
  const [focusedNumericField, setFocusedNumericField] = useState(null)

  // Fetch unique cities on component mount
  React.useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await apiClient.get('/store/unique-cities')
        const citiesData = response.data.data || []
        // Deduplicate on frontend to ensure uniqueness
        const uniqueCities = [...new Set(citiesData.filter((c) => c && c.trim() !== ''))]
        setCities(uniqueCities)
      } catch (error) {
        console.error('Error fetching cities:', error)
      } finally {
        setLoadingCities(false)
      }
    }
    fetchCities()
  }, [])

  const filteredCities = (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return cities
    return cities.filter((city) => 
      String(city).toLowerCase().includes(String(searchTerm).toLowerCase())
    )
  }

  const handleRowChange = (rowId, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const newValues = { ...row.values, [field]: value }
          // Calculate total amount if noOfStore or pricePerStore changes
          if (field === 'noOfStore' || field === 'pricePerStore') {
            const noOfStore = Number(newValues.noOfStore || 0)
            const pricePerStore = Number(newValues.pricePerStore || 0)
            const computedTotal = noOfStore * pricePerStore
            newValues.totalAmount = computedTotal
          }
          return { ...row, values: newValues }
        }
        return row
      }),
    )
  }

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: `row-${prev.length + 1}`, values: { area: '', noOfStore: '', pricePerStore: 350, totalAmount: 0 } },
    ])
  }

  const removeRow = (rowId) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId))
  }

  const handleSave = () => {
    onSave?.(rows, [{ label: 'AREA' }, { label: 'NO OF STORE' }, { label: 'PRICE PER STORE' }, { label: 'TOTAL AMOUNT' }], { vatMode: false, quantityMode: false })
  }

  // Calculate totals
  const subTotal = rows.reduce((sum, row) => sum + (Number(row.values.totalAmount) || 0), 0)
  const vat = Number((subTotal * 0.12).toFixed(2))
  const total = Number((subTotal + vat).toFixed(2))

  React.useEffect(() => {
    onTotalsChange?.({ subTotal, vat, total })
  }, [subTotal, vat, total, onTotalsChange])

  return (
    <div className="rounded border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">AREA</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">NO OF STORE</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">PRICE PER STORE</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">TOTAL AMOUNT</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, index) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  {loadingCities ? (
                    <input
                      type="text"
                      value={row.values.area || ''}
                      onChange={(e) => handleRowChange(row.id, 'area', e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                      placeholder="Loading cities..."
                      disabled
                    />
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={row.values.area || ''}
                        onChange={(e) => {
                          handleRowChange(row.id, 'area', e.target.value)
                          setActiveAreaDropdown(row.id)
                        }}
                        onFocus={() => setActiveAreaDropdown(row.id)}
                        onBlur={() => {
                          setTimeout(() => setActiveAreaDropdown(null), 150)
                        }}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                        placeholder="Search or type area"
                      />
                      {activeAreaDropdown === row.id && filteredCities(row.values.area).length > 0 && (
                        <div className="absolute left-0 top-full z-20 mt-1 max-h-40 w-full overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
                          {filteredCities(row.values.area).map((city) => (
                            <button
                              key={city}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                handleRowChange(row.id, 'area', city)
                                setActiveAreaDropdown(null)
                              }}
                              className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                            >
                              {city}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  {(() => {
                    const fieldKey = `${row.id}-noOfStore`
                    const isFocused = focusedNumericField === fieldKey
                    const value = row.values.noOfStore || 0
                    return (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={isFocused ? String(value) : formatQuantityInput(value)}
                        onChange={(e) => {
                          const nextValue = e.target.value.replace(/[^0-9]/g, '')
                          handleRowChange(row.id, 'noOfStore', nextValue === '' ? 0 : Number(nextValue))
                        }}
                        onFocus={() => setFocusedNumericField(fieldKey)}
                        onBlur={(e) => {
                          setFocusedNumericField(null)
                          const formatted = formatQuantityInput(value)
                          handleRowChange(row.id, 'noOfStore', parseDecimalInput(formatted))
                        }}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                        placeholder="0"
                      />
                    )
                  })()}
                </td>
                <td className="px-4 py-2">
                  {(() => {
                    const fieldKey = `${row.id}-pricePerStore`
                    const isFocused = focusedNumericField === fieldKey
                    const value = row.values.pricePerStore || 350
                    return (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={isFocused ? String(value) : formatNumberInput(value)}
                        onChange={(e) => {
                          const nextValue = e.target.value.replace(/[^0-9.]/g, '')
                          handleRowChange(row.id, 'pricePerStore', nextValue === '' ? 0 : Number(nextValue))
                        }}
                        onFocus={() => setFocusedNumericField(fieldKey)}
                        onBlur={(e) => {
                          setFocusedNumericField(null)
                          const formatted = formatNumberInput(value)
                          handleRowChange(row.id, 'pricePerStore', parseDecimalInput(formatted))
                        }}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                        placeholder="0.00"
                      />
                    )
                  })()}
                </td>
                <td className="px-4 py-2">
                  <div className="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-mono">
                    {formatNumberInput(row.values.totalAmount || 0)}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => removeRow(row.id)}
                    className="text-red-500 hover:text-red-700"
                    disabled={rows.length === 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
        <button
          onClick={addRow}
          className="text-xs font-bold uppercase tracking-wider text-black hover:text-gray-700"
        >
          + Add Row
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-black px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

const StatementDetailTable = React.forwardRef(function StatementDetailTable(
  {
    columns,
    registryLabel,
    footerLabel,
    footerMeta,
    statementId,
    onSave,
    onTotalsChange,
    saving,
    initialRows = [],
    documentMeta = {},
    vatPerRow = false,
    onVatModeChange,
    quantityMode = false,
    onQuantityModeChange,
    serviceQuantitySelection = {},
    onServiceQuantityChange,
    includeDrNo = true,
    onToggleDrNo,
    includeRtNo = true,
    onToggleRtNo,
  },
  ref,
) {
  const [rows, setRows] = useState(() => {
    if (Array.isArray(initialRows) && initialRows.length > 0) {
      return initialRows.map((r, i) => {
        if (r && r.id && r.values) return r
        return { id: r.id || `row-${i + 1}`, values: r.values || r }
      })
    }
    return [{ id: 'row-1', values: {} }]
  })
  
  // Apply default values for SERVICE TYPE and WORK DONE columns
  React.useEffect(() => {
    setRows((prevRows) => {
      const serviceTypeCol = columns.find((col) => String(col.header || '').toUpperCase() === 'SERVICE TYPE')
      const workDoneCol = columns.find((col) => String(col.header || '').toUpperCase() === 'WORK DONE')
      
      return prevRows.map((row) => {
        const newValues = { ...row.values }
        if (serviceTypeCol && (!newValues[serviceTypeCol.key] || newValues[serviceTypeCol.key] === '')) {
          newValues[serviceTypeCol.key] = 'MAINTENANCE'
        }
        if (workDoneCol && (!newValues[workDoneCol.key] || newValues[workDoneCol.key] === '')) {
          newValues[workDoneCol.key] = 'REPAIR AND MAINTENANCE'
        }
        return { ...row, values: newValues }
      })
    })
  }, [columns])
  
  const [cities, setCities] = useState([])
  const [loadingCities, setLoadingCities] = useState(true)
  const [activeAreaDropdown, setActiveAreaDropdown] = useState(null)
  const [parts, setParts] = useState([])
  const [loadingParts, setLoadingParts] = useState(true)
  const [activePartsDropdown, setActivePartsDropdown] = useState(null)

  // Fetch unique cities on component mount
  React.useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await apiClient.get('/store/unique-cities')
        const citiesData = response.data.data || []
        // Deduplicate on frontend to ensure uniqueness
        const uniqueCities = [...new Set(citiesData.filter((c) => c && c.trim() !== ''))]
        setCities(uniqueCities)
      } catch (error) {
        console.error('Error fetching cities:', error)
      } finally {
        setLoadingCities(false)
      }
    }
    fetchCities()
  }, [])

  // Fetch parts on component mount
  React.useEffect(() => {
    const fetchParts = async () => {
      try {
        const response = await apiClient.get('/parts')
        const partsData = response.data.data || []
        setParts(partsData)
      } catch (error) {
        console.error('Error fetching parts:', error)
      } finally {
        setLoadingParts(false)
      }
    }
    fetchParts()
  }, [])

  const filteredCities = (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return cities
    return cities.filter((city) => 
      String(city).toLowerCase().includes(String(searchTerm).toLowerCase())
    )
  }

  const filteredParts = (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return parts
    return parts.filter((part) => 
      String(part.name).toLowerCase().includes(String(searchTerm).toLowerCase()) ||
      String(part.description).toLowerCase().includes(String(searchTerm).toLowerCase())
    )
  }

  const filteredStores = (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return stores.slice(0, 20)
    return stores.filter((store) => 
      String(store.name).toLowerCase().includes(String(searchTerm).toLowerCase())
    ).slice(0, 20)
  }

  // Check if table has parts columns
  const hasPartsColumns = useMemo(() => {
    const headers = columns.map(col => String(col.header || '').toUpperCase())
    return headers.includes('PARTS DESCRIPTION') && 
           headers.includes('PARTS QTY.') && 
           headers.includes('PRICE') && 
           headers.includes('SUBTOTAL')
  }, [columns])

  // Initialize parts array for rows when table has parts columns
  React.useEffect(() => {
    if (hasPartsColumns) {
      setRows((prevRows) => {
        let needsUpdate = false
        const updatedRows = prevRows.map((row) => {
          if (!row.parts || row.parts.length === 0) {
            needsUpdate = true
            return { 
              ...row, 
              parts: [{
                id: `part-${row.id}-initial`,
                values: { partsDescription: '', partsQty: 0, price: 0, subtotal: 0 }
              }]
            }
          }
          return row
        })
        return needsUpdate ? updatedRows : prevRows
      })
    }
  }, [hasPartsColumns])

  // Parts management functions
  const addPart = (rowId) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const newPart = {
            id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            values: { partsDescription: '', partsQty: 0, price: 0, subtotal: 0 }
          }
          return { ...row, parts: [...(row.parts || []), newPart] }
        }
        return row
      }),
    )
  }

  const removePart = (rowId, partId) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const updatedParts = (row.parts || []).filter((part) => part.id !== partId)
          return { ...row, parts: updatedParts }
        }
        return row
      }),
    )
  }

  const handlePartChange = (rowId, partId, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const updatedParts = (row.parts || []).map((part) => {
            if (part.id === partId) {
              const newPartValues = { ...part.values, [field]: value }
              
              // Auto-compute subtotal
              if (field === 'partsQty' || field === 'price') {
                const partsQty = Number(newPartValues.partsQty || 0)
                const price = Number(newPartValues.price || 0)
                newPartValues.subtotal = partsQty * price
              }
              
              return { ...part, values: newPartValues }
            }
            return part
          })
          
          return { ...row, parts: updatedParts }
        }
        return row
      }),
    )
  }

  const handlePartSelect = (rowId, partId, part) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const updatedParts = (row.parts || []).map((partItem) => {
            if (partItem.id === partId) {
              const newPartValues = {
                ...partItem.values,
                partsDescription: part.name,
                partsQty: 1,
                price: part.price,
                subtotal: Number(part.price || 0)
              }
              return { ...partItem, values: newPartValues }
            }
            return partItem
          })
          
          return { ...row, parts: updatedParts }
        }
        return row
      }),
    )
  }

  useImperativeHandle(ref, () => ({
    saveRows: () =>
      onSave?.(
        rows.map((row) => ({
          ...row,
          values: {
            ...(row.values || {}),
            vat: vatPerRow ? getComputedVatValue(getComputedSalesTotal(row.values, columns)) : 0,
          },
        })),
        columns,
        {
          vatMode: vatPerRow,
          quantityMode: Boolean(columns.some((col) => isQuantityColumn(col))),
          soa_sub_total: computedTotals.subTotal,
          soa_vat: computedTotals.vat,
          soa_total: computedTotals.total,
        },
      ),
    exportExcel: () => exportStatementToExcel({ columns, rows, documentMeta, statementId, totals: computedTotals }),
    exportPdf: () => exportStatementToPdf({ columns, rows, documentMeta, statementId, totals: computedTotals }),
    generatePdfPreview: async (showSubtotal, showVat, showTotal) => {
      try {
        const blob = await exportStatementToPdf({ 
          columns, 
          rows, 
          documentMeta, 
          statementId, 
          totals: computedTotals,
          showSubtotal,
          showVat,
          showTotal
        })
        return blob
      } catch (err) {
        console.error('Failed to generate PDF preview:', err)
        throw err
      }
    },
  }))

  // Compute live totals (subtotal, vat @12%, total) and notify parent when rows change
  useEffect(() => {
    const subTotal = rows.reduce((sum, r) => {
      // For parts format, sum all part subtotals
      if (r.parts && r.parts.length > 0) {
        const partsSum = r.parts.reduce((partSum, part) => {
          return partSum + (part.values?.subtotal || 0)
        }, 0)
        return sum + partsSum
      }
      return sum + getComputedSalesTotal(r.values, columns)
    }, 0)
    const vat = vatPerRow
      ? rows.reduce(
          (sum, r) => sum + getComputedVatValue(
            r.parts && r.parts.length > 0 
              ? r.parts.reduce((partSum, part) => partSum + (part.values?.subtotal || 0), 0)
              : getComputedSalesTotal(r.values, columns)
          ),
          0,
        )
      : Number((subTotal * 0.12).toFixed(2))
    const total = Number((subTotal + vat).toFixed(2))
    setComputedTotals({ subTotal, vat, total })
    onTotalsChange?.({ subTotal, vat, total })
  }, [rows, columns, onTotalsChange, vatPerRow])

  const [localSearchQuery, setLocalSearchQuery] = useState('')
  const [selectedColumnKey, setSelectedColumnKey] = useState('All')
  const [selectedColumnValue, setSelectedColumnValue] = useState('All')
  const [hoveredRowId, setHoveredRowId] = useState(null)
  const [addPartRowVisible, setAddPartRowVisible] = useState(null)
  const [addPartRowHiding, setAddPartRowHiding] = useState(null)
  const [qtyPanelOpen, setQtyPanelOpen] = useState(false)
  const [stores, setStores] = useState([])
  const [activeStoreDropdown, setActiveStoreDropdown] = useState({ rowId: null, fieldKey: null })
  const [focusedNumericField, setFocusedNumericField] = useState(null)
  const [computedTotals, setComputedTotals] = useState({ subTotal: 0, vat: 0, total: 0 })
  const storeDropdownBlurTimer = useRef(null)
  const qtyPanelCloseTimer = useRef(null)
  const addPartRowTimer = useRef(null)

  const clearAddPartRowTimer = () => {
    if (addPartRowTimer.current) {
      clearTimeout(addPartRowTimer.current)
      addPartRowTimer.current = null
    }
  }

  const handleRowMouseEnter = (rowId) => {
    clearAddPartRowTimer()
    setAddPartRowVisible(rowId)
    setAddPartRowHiding(null)
  }

  const handleRowMouseLeave = () => {
    clearAddPartRowTimer()
    setAddPartRowHiding(addPartRowVisible)
    addPartRowTimer.current = setTimeout(() => {
      setAddPartRowVisible(null)
      setTimeout(() => setAddPartRowHiding(null), 300) // Remove from DOM after transition
    }, 100) // Small delay before starting hide
  }

  const loadStores = async () => {
    try {
      const response = await apiClient.get('/store')
      const storeList = (response.data?.data || []).map((item) => ({
        id: item.store_id ?? item.id,
        number: (item.number ?? item.regionalCode ?? '').toString(),
        name: item.name ?? '',
      }))
      setStores(storeList.filter((store) => store.number && store.name))
    } catch (err) {
      // Ignore store lookup failures
    }
  }

  const clearStoreDropdownBlurTimer = () => {
    if (storeDropdownBlurTimer.current) {
      clearTimeout(storeDropdownBlurTimer.current)
      storeDropdownBlurTimer.current = null
    }
  }

  useEffect(() => {
    loadStores()
    return () => {
      clearStoreDropdownBlurTimer()
      clearAddPartRowTimer()
    }
  }, [])

  const getRelatedStoreKey = (columnKey, fieldType) => {
    if (fieldType === 'storeNumber') {
      return columns.find((col) => isStoreNameColumn(col))?.key
    }
    if (fieldType === 'storeName') {
      return columns.find((col) => isStoreNumberColumn(col))?.key
    }
    return null
  }

  const findStoreByNumber = (number) => {
    if (!number) return null
    const normalized = String(number).trim().toLowerCase()
    return stores.find((store) => String(store.number).trim().toLowerCase() === normalized)
  }

  const findStoreByName = (term) => {
    if (!term) return null
    const normalized = String(term).trim().toLowerCase()
    return stores.find(
      (store) =>
        String(store.name).trim().toLowerCase() === normalized ||
        String(store.number).trim().toLowerCase() === normalized,
    )
  }

  const handleStoreFieldChange = (rowId, columnKey, value, fieldType) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) return row

        const nextValues = {
          ...row.values,
          [columnKey]: value,
        }

        if (fieldType === 'storeNumber') {
          const matched = findStoreByNumber(value)
          if (matched) {
            const relatedKey = getRelatedStoreKey(columnKey, fieldType)
            if (relatedKey) nextValues[relatedKey] = matched.name
          }
        }

        if (fieldType === 'storeName') {
          const matched = findStoreByName(value)
          const relatedKey = getRelatedStoreKey(columnKey, fieldType)
          if (matched) {
            if (relatedKey) nextValues[relatedKey] = matched.number
          } else if (relatedKey) {
            nextValues[relatedKey] = ''
          }
        }

        return {
          ...row,
          values: nextValues,
        }
      }),
    )
  }

  const handleStoreSelect = (rowId, store, columnKey, fieldType) => {
    const relatedKey = getRelatedStoreKey(columnKey, fieldType)
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) return row

        const nextValues = {
          ...row.values,
          [columnKey]: fieldType === 'storeNumber' ? store.number : store.name,
        }
        if (relatedKey) {
          nextValues[relatedKey] = fieldType === 'storeNumber' ? store.name : store.number
        }
        return {
          ...row,
          values: nextValues,
        }
      }),
    )
    clearStoreDropdownBlurTimer()
    setActiveStoreDropdown({ rowId: null, fieldKey: null })
  }

  const storeSuggestions = (query) => {
    const normalized = String(query || '')
      .trim()
      .toLowerCase()
    if (!normalized) return stores.slice(0, 8)
    return stores
      .filter(
        (store) =>
          store.name.toLowerCase().includes(normalized) ||
          store.number.toLowerCase().includes(normalized),
      )
      .slice(0, 8)
  }

  const handleServiceToggle = (rowId, columnKey, checked, serviceMeta) => {
    if (!serviceMeta) return

    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) return row

        const nextValues = {
          ...row.values,
          [columnKey]: checked,
        }

        // When service is checked, auto-set qty to 1 if qty column exists for this service
        if (checked) {
          const qtyColumn = columns.find((col) => col.quantityMeta?.relatedServiceKey === columnKey)
          if (qtyColumn) {
            nextValues[qtyColumn.key] = 1
          }
        } else {
          // When service is unchecked, clear the qty for that service
          const qtyColumn = columns.find((col) => col.quantityMeta?.relatedServiceKey === columnKey)
          if (qtyColumn) {
            nextValues[qtyColumn.key] = 0
          }
        }

        // Sum all checked service columns' prices for this row
        const serviceCols = columns.filter((col) => col.serviceMeta)
        let salesSum = 0
        serviceCols.forEach((col) => {
          const colKey = col.key
          const price = Number(col.serviceMeta?.servicePrice || 0)
          const isChecked = colKey === columnKey ? Boolean(checked) : Boolean(row.values?.[colKey])
          if (isChecked) salesSum += price
        })

        const salesColumnKey = columns.find((col) => isSalesColumn(col))?.key
        if (salesColumnKey) {
          nextValues[salesColumnKey] = Number(salesSum.toFixed(2))
        }

        const totalSalesColumnKey = columns.find((col) => isTotalSalesColumn(col))?.key
        if (totalSalesColumnKey) {
          nextValues[totalSalesColumnKey] = getComputedSalesTotal(nextValues, columns)
        }
        if (vatPerRow) {
          nextValues.vat = getComputedVatValue(getComputedSalesTotal(nextValues, columns))
        } else {
          nextValues.vat = 0
        }

        return {
          ...row,
          values: nextValues,
        }
      }),
    )
  }

  const uniqueColumnValues = useMemo(() => {
    if (!selectedColumnKey || selectedColumnKey === 'All') return []

    const values = rows
      .map((item) => {
        const val = item.values?.[selectedColumnKey]
        return val !== undefined && val !== null ? String(val) : ''
      })
      .filter(Boolean)

    return [...new Set(values)].sort()
  }, [rows, selectedColumnKey])

  const handleColumnKeyChange = (e) => {
    setSelectedColumnKey(e.target.value)
    setSelectedColumnValue('All')
  }

  const handleAddRow = () => {
    const serviceTypeCol = columns.find((col) => String(col.header || '').toUpperCase() === 'SERVICE TYPE')
    const workDoneCol = columns.find((col) => String(col.header || '').toUpperCase() === 'WORK DONE')
    
    const newValues = {}
    if (serviceTypeCol) {
      newValues[serviceTypeCol.key] = 'MAINTENANCE'
    }
    if (workDoneCol) {
      newValues[workDoneCol.key] = 'REPAIR AND MAINTENANCE'
    }
    
    const newRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      values: newValues,
    }
    
    // Initialize parts array if table has parts columns
    if (hasPartsColumns) {
      newRow.parts = [{
        id: `part-${newRow.id}-initial`,
        values: { partsDescription: '', partsQty: 0, price: 0, subtotal: 0 }
      }]
    }
    
    setRows((currentRows) => [
      ...currentRows,
      newRow,
    ])
    setSelectedColumnKey('All')
    setSelectedColumnValue('All')
    setLocalSearchQuery('')
  }

  const handleCellChange = (rowId, columnKey, value) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.id !== rowId) return row

        const changedColumn = columns.find((col) => col.key === columnKey)
        const nextValues = {
          ...row.values,
          [columnKey]: value,
        }

        // Auto-compute TOTAL AMOUNT for maintenance format (NO OF STORE × PRICE PER STORE)
        const noOfStoreCol = columns.find((col) => String(col.header || '').toUpperCase() === 'NO OF STORE')
        const pricePerStoreCol = columns.find((col) => String(col.header || '').toUpperCase() === 'PRICE PER STORE')
        const totalAmountCol = columns.find((col) => String(col.header || '').toUpperCase() === 'TOTAL AMOUNT')
        
        if (noOfStoreCol && pricePerStoreCol && totalAmountCol) {
          if (columnKey === noOfStoreCol.key || columnKey === pricePerStoreCol.key) {
            const noOfStore = Number(nextValues[noOfStoreCol.key] || 0)
            const pricePerStore = Number(nextValues[pricePerStoreCol.key] || 0)
            nextValues[totalAmountCol.key] = noOfStore * pricePerStore
          }
        }

        // Auto-compute TOTAL VAT-EX and TOTAL VAT-IN for Official Invoice format (NO OF STORE × AMOUNT PER STORE)
        const amountPerStoreCol = columns.find((col) => String(col.header || '').toUpperCase() === 'AMOUNT PER STORE')
        const totalVatExCol = columns.find((col) => String(col.header || '').toUpperCase() === 'TOTAL VAT-EX')
        const totalVatInCol = columns.find((col) => String(col.header || '').toUpperCase() === 'TOTAL VAT-IN')
        
        if (noOfStoreCol && amountPerStoreCol && totalVatExCol) {
          if (columnKey === noOfStoreCol.key || columnKey === amountPerStoreCol.key) {
            const noOfStore = Number(nextValues[noOfStoreCol.key] || 0)
            const amountPerStore = Number(nextValues[amountPerStoreCol.key] || 0)
            nextValues[totalVatExCol.key] = noOfStore * amountPerStore
          }
        }
        
        if (noOfStoreCol && amountPerStoreCol && totalVatInCol) {
          if (columnKey === noOfStoreCol.key || columnKey === amountPerStoreCol.key) {
            const noOfStore = Number(nextValues[noOfStoreCol.key] || 0)
            const amountPerStore = Number(nextValues[amountPerStoreCol.key] || 0)
            const totalVatEx = noOfStore * amountPerStore
            // TOTAL VAT-IN includes 12% VAT
            nextValues[totalVatInCol.key] = totalVatEx * 1.12
          }
        }

        // If PARTS DESCRIPTION is cleared, set PARTS QTY to 0
        const partsDescCol = columns.find((col) => String(col.header || '').toUpperCase() === 'PARTS DESCRIPTION')
        const partsQtyCol = columns.find((col) => String(col.header || '').toUpperCase() === 'PARTS QTY.')
        const priceCol = columns.find((col) => String(col.header || '').toUpperCase() === 'PRICE')
        const subtotalCol = columns.find((col) => String(col.header || '').toUpperCase() === 'SUBTOTAL')
        
        if (partsDescCol && partsQtyCol && columnKey === partsDescCol.key) {
          if (!value || value.trim() === '') {
            nextValues[partsQtyCol.key] = 0
          }
        }

        // Auto-compute SUBTOTAL for parts (PARTS QTY × PRICE)
        if (partsQtyCol && priceCol && subtotalCol) {
          if (columnKey === partsQtyCol.key || columnKey === priceCol.key) {
            const partsQty = Number(nextValues[partsQtyCol.key] || 0)
            const price = Number(nextValues[priceCol.key] || 0)
            nextValues[subtotalCol.key] = partsQty * price
          }
        }

        if (changedColumn?.quantityMeta?.relatedServiceKey) {
          const relatedServiceKey = changedColumn.quantityMeta.relatedServiceKey
          const relatedServiceColumn = columns.find(
            (col) =>
              col.key === relatedServiceKey || col.serviceMeta?.serviceId === relatedServiceKey,
          )
          if (relatedServiceColumn?.serviceMeta && Number(value || 0) > 0) {
            nextValues[relatedServiceColumn.key] = true
          }
        }

        const computedTotal = getComputedSalesTotal(nextValues, columns)
        const totalSalesColumnKey = columns.find((col) => isTotalSalesColumn(col))?.key
        const salesColumnKey = columns.find((col) => isSalesColumn(col))?.key

        if (totalSalesColumnKey) {
          nextValues[totalSalesColumnKey] = computedTotal
        }

        if (
          changedColumn &&
          (isQuantityColumn(changedColumn) || Boolean(changedColumn.serviceMeta))
        ) {
          if (salesColumnKey) {
            nextValues[salesColumnKey] = computedTotal
          }
        }

        if (
          changedColumn &&
          (isSalesColumn(changedColumn) || isAdditionalSalesColumn(changedColumn))
        ) {
          if (vatPerRow) {
            nextValues.vat = getComputedVatValue(computedTotal)
          } else {
            nextValues.vat = 0
          }
        }

        return {
          ...row,
          values: nextValues,
        }
      }),
    )
  }

  const handleDeleteRow = (rowId) => {
    setRows((currentRows) => currentRows.filter((row) => row.id !== rowId))
  }

  const handleDragStart = (event, rowId) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', rowId)
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (event, targetRowId) => {
    event.preventDefault()
    const fromId = event.dataTransfer.getData('text/plain')
    if (!fromId || fromId === targetRowId) return

    setRows((currentRows) => {
      const fromIndex = currentRows.findIndex((row) => row.id === fromId)
      const toIndex = currentRows.findIndex((row) => row.id === targetRowId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return currentRows

      const nextRows = [...currentRows]
      const [moved] = nextRows.splice(fromIndex, 1)
      nextRows.splice(toIndex, 0, moved)
      return nextRows
    })
  }

  useEffect(() => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        const nextValues = { ...(row.values || {}) }
        const totalSalesColumnKey = columns.find((col) => isTotalSalesColumn(col))?.key
        const computedSales = getComputedSalesTotal(nextValues, columns)

        if (totalSalesColumnKey && Number(nextValues[totalSalesColumnKey] || 0) !== computedSales) {
          nextValues[totalSalesColumnKey] = computedSales
        }

        const computedVat = vatPerRow ? getComputedVatValue(computedSales) : 0
        const existingVat = Number(nextValues.vat || 0)

        if (existingVat !== computedVat) {
          nextValues.vat = computedVat
        }

        if (JSON.stringify(row.values) === JSON.stringify(nextValues)) return row

        return {
          ...row,
          values: nextValues,
        }
      }),
    )
  }, [columns, vatPerRow])

  const filteredData = useMemo(() => {
    const query = localSearchQuery.trim().toLowerCase()

    return rows.filter((item) => {
      const activeSearchFields = columns.map((col) => col.key).filter(Boolean)
      const matchesSearch =
        query.length === 0
          ? true
          : activeSearchFields.length === 0 ||
            activeSearchFields.some((field) => {
              const val = item.values?.[field]
              return val ? String(val).toLowerCase().includes(query) : false
            })

      let matchesColumnFilter = true
      if (selectedColumnKey !== 'All' && selectedColumnValue !== 'All') {
        const itemValue = item.values?.[selectedColumnKey]
        matchesColumnFilter =
          itemValue !== undefined && itemValue !== null && String(itemValue) === selectedColumnValue
      }

      return matchesSearch && matchesColumnFilter
    })
  }, [rows, columns, localSearchQuery, selectedColumnKey, selectedColumnValue])

  return (
    <div className="h-auto lg:flex-1 lg:min-h-0 flex flex-col rounded border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 bg-gray-900 px-6 py-4 sm:flex-row sm:items-center sm:justify-between lg:shrink-0">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-100">
            {registryLabel}
          </h3>
          <p className="text-[11px] text-gray-400">
            Showing {filteredData.length} of {rows.length} registered entry
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          
          <label className="flex items-center gap-2 rounded border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-800 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={includeDrNo}
              onChange={(e) => onToggleDrNo?.(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-red-500 focus:ring-red-500"
            />
            <span className="text-xs">DR NO.</span>
          </label>

          <label className="flex items-center gap-2 rounded border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-800 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={includeRtNo}
              onChange={(e) => onToggleRtNo?.(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-red-500 focus:ring-red-500"
            />
            <span className="text-xs">RT NO.</span>
          </label>
          
          <select
            value={vatPerRow ? 'per-row' : 'overall'}
            onChange={(event) => onVatModeChange?.(event.target.value === 'per-row')}
            className="bg-white text-xs text-gray-800 rounded border border-gray-300 px-2 py-1.5 font-medium shadow-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors cursor-pointer"
          >
            <option value="overall">Overall VAT</option>
            <option value="per-row">VAT per row</option>
          </select>


          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div
              className="relative"
              onMouseEnter={() => {
                if (quantityMode) {
                  clearTimeout(qtyPanelCloseTimer.current)
                  setQtyPanelOpen(true)
                }
              }}
              onMouseLeave={() => {
                qtyPanelCloseTimer.current = window.setTimeout(() => {
                  setQtyPanelOpen(false)
                }, 120)
              }}
            >
              <select
                value={quantityMode ? 'add' : 'off'}
                onChange={(event) => {
                  const v = event.target.value === 'add'
                  onQuantityModeChange?.(v)
                  setQtyPanelOpen(Boolean(v))
                }}
                onFocus={() => {
                  if (quantityMode) {
                    clearTimeout(qtyPanelCloseTimer.current)
                    setQtyPanelOpen(true)
                  }
                }}
                className="bg-white text-xs text-gray-800 rounded border border-gray-300 px-2 py-1.5 font-medium shadow-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors cursor-pointer"
              >
                <option value="off">No Qty</option>
                <option value="add">Add Qty</option>
              </select>

              {quantityMode && qtyPanelOpen ? (
                <div
                  className="absolute left-0 top-full z-30 mt-2 min-w-[14rem] max-w-[16rem] rounded border border-gray-700 bg-gray-900 px-3 py-3 shadow-lg"
                  onMouseEnter={() => {
                    clearTimeout(qtyPanelCloseTimer.current)
                    setQtyPanelOpen(true)
                  }}
                  onMouseLeave={() => {
                    qtyPanelCloseTimer.current = window.setTimeout(() => {
                      setQtyPanelOpen(false)
                    }, 120)
                  }}
                >
                  <div className="flex flex-col gap-2">
                    {columns
                      .filter((column) => column.serviceMeta)
                      .map((column) => {
                        const serviceKey = normalizeHeaderKey(
                          column.serviceMeta?.serviceKey || column.key,
                        )
                        const isSelected = Boolean(serviceQuantitySelection?.[serviceKey])

                        return (
                          <label
                            key={serviceKey}
                            className="flex items-center gap-2 rounded border border-gray-700 bg-gray-800 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-200"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(event) =>
                                onServiceQuantityChange?.(serviceKey, event.target.checked)
                              }
                              className="h-3.5 w-3.5 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
                            />
                            <span>{column.header}</span>
                          </label>
                        )
                      })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <input
            type="text"
            placeholder="Search matching entries..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="w-full sm:w-48 bg-white text-xs text-gray-800 placeholder-gray-500 rounded border border-gray-300 px-3 py-1.5 font-medium shadow-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
          />

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
                    {typeof col.header === 'object' ? col.header.header || col.header.key || String(col.key) : String(col.header || col.key)}
                  </option>
                ),
            )}
          </select>

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

      <div className="overflow-x-auto lg:flex-1 lg:overflow-y-auto">
        <table className="w-full text-center border-collapse relative">
          <thead>
            <tr className="border-b border-gray-100 bg-red-600 text-white text-[9px] font-bold uppercase tracking-widest">
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  className={`sticky top-0 z-10 bg-red-600 px-6 py-3 ${col.key === 'date' ? 'w-[6rem] px-3' : ''} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  {typeof col.header === 'object' ? col.header.header || col.header.key || String(col.key) : String(col.header || col.key)}
                </th>
              ))}
              <th className="sticky top-0 z-10 bg-red-600 w-0 px-0 py-3"></th>
            </tr>
          </thead>
          <tbody className="group divide-y divide-gray-100 text-xs font-medium text-gray-700">
            {filteredData.length > 0 ? (
              filteredData.map((row, rowIdx) => {
                const hasParts = hasPartsColumns && row.parts && row.parts.length > 0
                const partsCount = hasParts ? row.parts.length : 0
                const shouldRenderAsParts = hasPartsColumns
                
                return (
                  <React.Fragment key={row.id || rowIdx}>
                    {shouldRenderAsParts ? (
                      // Render in parts mode
                      (row.parts || []).map((part, partIdx) => {
                        const isFirstPart = partIdx === 0
                        
                        return (
                          <tr
                            key={part.id}
                            data-row-id={row.id}
                            className="hover:bg-gray-50/50 transition-colors"
                            onMouseEnter={() => handleRowMouseEnter(row.id)}
                            onMouseLeave={() => handleRowMouseLeave()}
                          >
                            {columns.map((col, colIdx) => {
                              const isNumberField = isStoreNumberColumn(col)
                              const isNameField = isStoreNameColumn(col)
                              const isAreaField = String(col.header || '').toUpperCase() === 'AREA'
                              const isDateField = isDateColumn(col)
                              const isNumericField = isNumericColumn(col)
                              const isPartsDescField = String(col.header || '').toUpperCase() === 'PARTS DESCRIPTION'
                              const isPartsQtyField = String(col.header || '').toUpperCase() === 'PARTS QTY.'
                              const isPriceField = String(col.header || '').toUpperCase() === 'PRICE'
                              const isSubtotalField = String(col.header || '').toUpperCase() === 'SUBTOTAL'
                              const isTotalInvoiceField = String(col.header || '').toUpperCase() === 'TOTAL INVOICE AMOUNT'
                              
                              // Check if this is a parts column
                              const isPartsColumn = isPartsDescField || isPartsQtyField || isPriceField || isSubtotalField
                              
                              // For non-parts columns, only render on first part with rowSpan
                              if (!isPartsColumn) {
                                if (!isFirstPart) return null // Skip for subsequent parts
                                
                                const currentValue = row.values?.[col.key] ?? ''
                                
                                // Calculate total invoice amount by summing all part subtotals
                                const totalInvoiceAmount = isTotalInvoiceField && row.parts
                                  ? row.parts.reduce((sum, part) => sum + (Number(part.values?.subtotal || 0)), 0)
                                  : currentValue
                                
                                return (
                                  <td
                                    key={col.key}
                                    rowSpan={partsCount}
                                    className={`px-3 py-2 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                  >
                                    {isTotalInvoiceField ? (
                                      <span className="block w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                                        {formatCurrency(totalInvoiceAmount)}
                                      </span>
                                    ) : isDateField ? (
                                      <input
                                        type="date"
                                        value={currentValue || ''}
                                        onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                        className="w-full rounded border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                      />
                                    ) : isAreaField ? (
                                      loadingCities ? (
                                        <input
                                          type="text"
                                          value={currentValue}
                                          onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                          className="w-full rounded border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                          placeholder="Loading cities..."
                                          disabled
                                        />
                                      ) : (
                                        <div className="relative">
                                          <input
                                            type="text"
                                            value={currentValue}
                                            onChange={(e) => {
                                              handleCellChange(row.id, col.key, e.target.value)
                                              setActiveAreaDropdown(row.id)
                                            }}
                                            onFocus={() => setActiveAreaDropdown(row.id)}
                                            onBlur={() => {
                                              setTimeout(() => setActiveAreaDropdown(null), 150)
                                            }}
                                            className="w-full rounded border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                            placeholder="Search or type area"
                                          />
                                          {activeAreaDropdown === row.id && filteredCities(currentValue).length > 0 && (
                                            <div className="absolute left-0 top-full z-20 mt-1 max-h-40 w-full overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
                                              {filteredCities(currentValue).map((city) => (
                                                <button
                                                  key={city}
                                                  type="button"
                                                  onMouseDown={(e) => {
                                                    e.preventDefault()
                                                    handleCellChange(row.id, col.key, city)
                                                    setActiveAreaDropdown(null)
                                                  }}
                                                  className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                                                >
                                                  {city}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    ) : isNumberField ? (
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        min="0"
                                        step="1"
                                        value={String(currentValue ?? '').replace(/\.0+$/, '')}
                                        onChange={(e) => {
                                          const nextValue = e.target.value.replace(/[^0-9]/g, '')
                                          handleCellChange(
                                            row.id,
                                            col.key,
                                            nextValue === '' ? 0 : Number(nextValue),
                                          )
                                        }}
                                        className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                                        placeholder="0"
                                      />
                                    ) : isNameField ? (
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={currentValue}
                                          onChange={(e) => {
                                            handleCellChange(row.id, col.key, e.target.value)
                                            setActiveStoreDropdown(`${row.id}-${col.key}`)
                                          }}
                                          onFocus={() => setActiveStoreDropdown(`${row.id}-${col.key}`)}
                                          onBlur={() => {
                                            setTimeout(() => setActiveStoreDropdown(null), 200)
                                          }}
                                          className="w-full rounded border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                          placeholder="Store name"
                                        />
                                        {activeStoreDropdown === `${row.id}-${col.key}` && filteredStores(currentValue).length > 0 && (
                                          <div 
                                            className="absolute left-0 top-full z-20 mt-1 max-h-52 w-80 max-w-[90vw] overflow-y-auto rounded border border-gray-200 bg-white shadow-lg"
                                            onMouseDown={(e) => e.preventDefault()}
                                          >
                                            {filteredStores(currentValue).map((store) => (
                                              <button
                                                key={store.store_id}
                                                type="button"
                                                onClick={(e) => {
                                                  e.preventDefault()
                                                  handleCellChange(row.id, col.key, store.name)
                                                  // Auto-fill store number if column exists
                                                  const storeNumberCol = columns.find((c) => String(c.header || '').toUpperCase() === 'STORE NO.' || String(c.header || '').toUpperCase() === 'STORE NUMBER')
                                                  if (storeNumberCol) {
                                                    handleCellChange(row.id, storeNumberCol.key, store.number)
                                                  }
                                                  setActiveStoreDropdown(null)
                                                }}
                                                className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                                              >
                                                <div className="font-semibold">{store.name}</div>
                                                <div className="text-[10px] text-gray-500">{store.number}</div>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ) : isNumericField ? (
                                      (() => {
                                        const fieldKey = `${row.id}-${col.key}`
                                        const isFocused = focusedNumericField === fieldKey
                                        return (
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            value={isFocused ? String(currentValue) : formatNumberInput(currentValue)}
                                            onChange={(e) => {
                                              const nextValue = e.target.value.replace(/[^0-9.]/g, '')
                                              handleCellChange(row.id, col.key, nextValue === '' ? 0 : Number(nextValue))
                                            }}
                                            onFocus={() => setFocusedNumericField(fieldKey)}
                                            onBlur={(e) => {
                                              setFocusedNumericField(null)
                                              const formatted = formatNumberInput(currentValue)
                                              handleCellChange(row.id, col.key, parseDecimalInput(formatted))
                                            }}
                                            className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                            placeholder="0.00"
                                          />
                                        )
                                      })()
                                    ) : (
                                      <input
                                        type="text"
                                        value={currentValue}
                                        onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                        className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                        placeholder={typeof col.header === 'object' ? col.header.header || col.header.key || String(col.key) : String(col.header || col.key) || 'Enter value'}
                                      />
                                    )}
                                  </td>
                                )
                              }
                              
                              // Parts columns - render for each part
                              if (isPartsDescField) {
                                const partValue = part.values?.partsDescription || ''
                                return (
                                  <td key={col.key} className="px-3 py-2">
                                    {loadingParts ? (
                                      <input
                                        type="text"
                                        value={partValue}
                                        onChange={(e) => handlePartChange(row.id, part.id, 'partsDescription', e.target.value)}
                                        className="w-full rounded border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                        placeholder="Loading parts..."
                                        disabled
                                      />
                                    ) : (
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={partValue}
                                          onChange={(e) => {
                                            handlePartChange(row.id, part.id, 'partsDescription', e.target.value)
                                            setActivePartsDropdown(`${row.id}-${part.id}`)
                                          }}
                                          onFocus={() => setActivePartsDropdown(`${row.id}-${part.id}`)}
                                          onBlur={() => {
                                            setTimeout(() => setActivePartsDropdown(null), 200)
                                          }}
                                          className="w-full rounded border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                          placeholder="Search or type part"
                                        />
                                        {activePartsDropdown === `${row.id}-${part.id}` && filteredParts(partValue).length > 0 && (
                                          <div 
                                            className="absolute left-0 top-full z-20 mt-1 max-h-32 w-80 max-w-[90vw] overflow-y-auto rounded border border-gray-200 bg-white shadow-lg"
                                            onMouseDown={(e) => e.preventDefault()}
                                          >
                                            {filteredParts(partValue).map((partData) => (
                                              <button
                                                key={partData.part_id}
                                                type="button"
                                                onClick={(e) => {
                                                  e.preventDefault()
                                                  handlePartSelect(row.id, part.id, partData)
                                                  setActivePartsDropdown(null)
                                                }}
                                                className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                                              >
                                                <div className="font-semibold">{partData.name}</div>
                                                <div className="text-[10px] text-gray-500">{partData.description}</div>
                                                <div className="text-[10px] text-gray-400">Price: {partData.price}</div>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                )
                              }
                              
                              if (isPartsQtyField) {
                                const qtyValue = part.values?.partsQty || 0
                                const fieldKey = `${row.id}-${part.id}-partsQty`
                                const isFocused = focusedNumericField === fieldKey
                                return (
                                  <td key={col.key} className="px-3 py-2">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={isFocused ? String(qtyValue) : formatQuantityInput(qtyValue)}
                                      onChange={(e) => {
                                        const nextValue = e.target.value.replace(/[^0-9]/g, '')
                                        handlePartChange(row.id, part.id, 'partsQty', nextValue === '' ? 0 : Number(nextValue))
                                      }}
                                      onFocus={() => setFocusedNumericField(fieldKey)}
                                      onBlur={(e) => {
                                        setFocusedNumericField(null)
                                        const formatted = formatQuantityInput(qtyValue)
                                        handlePartChange(row.id, part.id, 'partsQty', parseDecimalInput(formatted))
                                      }}
                                      className="w-full rounded border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                      placeholder="0"
                                    />
                                  </td>
                                )
                              }
                              
                              if (isPriceField) {
                                const priceValue = part.values?.price || 0
                                const fieldKey = `${row.id}-${part.id}-price`
                                const isFocused = focusedNumericField === fieldKey
                                return (
                                  <td key={col.key} className="px-3 py-2">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={isFocused ? String(priceValue) : formatNumberInput(priceValue)}
                                      onChange={(e) => {
                                        const nextValue = e.target.value.replace(/[^0-9.]/g, '')
                                        handlePartChange(row.id, part.id, 'price', nextValue === '' ? 0 : Number(nextValue))
                                      }}
                                      onFocus={() => setFocusedNumericField(fieldKey)}
                                      onBlur={(e) => {
                                        setFocusedNumericField(null)
                                        const formatted = formatNumberInput(priceValue)
                                        handlePartChange(row.id, part.id, 'price', parseDecimalInput(formatted))
                                      }}
                                      className="w-full rounded border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                      placeholder="0.00"
                                    />
                                  </td>
                                )
                              }
                              
                              if (isSubtotalField) {
                                return (
                                  <td key={col.key} className="px-3 py-2 font-mono">
                                    <div className="flex items-center gap-2">
                                      <span>{formatCurrency(part.values?.subtotal || 0)}</span>
                                      <button
                                        onClick={() => removePart(row.id, part.id)}
                                        className="text-red-400 hover:text-red-600"
                                        title="Delete Part"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                )
                              }
                              
                              return <td key={col.key} className="px-6 py-3"></td>
                            })}
                            {isFirstPart && (
                              <td rowSpan={partsCount} className="w-0 px-0 py-2 overflow-hidden transition-all duration-200 group-hover:w-12 group-hover:px-0 group-focus-within:w-12 group-focus-within:px-0">
                                <div className="flex h-full items-center justify-center">
                                  <button
                                    onClick={() => handleDeleteRow(row.id)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border cursor-pointer text-white bg-red-600 opacity-0 transition-all duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
                                    aria-label="Delete row"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        )
                      })
                    ) : (
                      // Regular row without parts
                      <tr
                        key={row.id || rowIdx}
                        className="hover:bg-gray-50/50 transition-colors"
                        onMouseEnter={() => handleRowMouseEnter(row.id)}
                        onMouseLeave={() => handleRowMouseLeave()}
                      >
                        {columns.map((col, colIdx) => {
                          const isNumberField = isStoreNumberColumn(col)
                          const isNameField = isStoreNameColumn(col)
                          const isAreaField = String(col.header || '').toUpperCase() === 'AREA'
                          const isPartsDescField = String(col.header || '').toUpperCase() === 'PARTS DESCRIPTION'
                          const isNumericField = isNumericColumn(col)
                          const currentValue = row.values?.[col.key] ?? ''
                          const isServiceColumn = Boolean(col.serviceMeta)
                          const isMoneyInputColumn = isSalesColumn(col) || isAdditionalSalesColumn(col)
                          const isTotalField = isTotalSalesColumn(col)
                          const isDateInputColumn = isDateColumn(col)
                          const isVatColumn = col.key === 'vat'
                          const isQtyInputColumn = isQuantityColumn(col)
                          
                          return (
                            <td
                              key={colIdx}
                              className={`px-3 py-2 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                            >
                              {isRowNumberColumn(col) ? (
                                <span className="block rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                                  {rowIdx + 1}
                                </span>
                              ) : isAreaField ? (
                                loadingCities ? (
                                  <input
                                    type="text"
                                    value={currentValue}
                                    onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                    className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                    placeholder="Loading cities..."
                                    disabled
                                  />
                                ) : (
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={currentValue}
                                      onChange={(e) => {
                                        handleCellChange(row.id, col.key, e.target.value)
                                        setActiveAreaDropdown(row.id)
                                      }}
                                      onFocus={() => setActiveAreaDropdown(row.id)}
                                      onBlur={() => {
                                        setTimeout(() => setActiveAreaDropdown(null), 150)
                                      }}
                                      className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                      placeholder="Search or type area"
                                    />
                                    {activeAreaDropdown === row.id && filteredCities(currentValue).length > 0 && (
                                      <div className="absolute left-0 top-full z-20 mt-1 max-h-40 w-full overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
                                        {filteredCities(currentValue).map((city) => (
                                          <button
                                            key={city}
                                            type="button"
                                            onMouseDown={(e) => {
                                              e.preventDefault()
                                              handleCellChange(row.id, col.key, city)
                                              setActiveAreaDropdown(null)
                                            }}
                                            className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                                          >
                                            {city}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              ) : isPartsDescField ? (
                                loadingParts ? (
                                  <input
                                    type="text"
                                    value={currentValue}
                                    onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                    className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                    placeholder="Loading parts..."
                                    disabled
                                  />
                                ) : (
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={currentValue}
                                      onChange={(e) => {
                                        handleCellChange(row.id, col.key, e.target.value)
                                        setActivePartsDropdown(row.id)
                                      }}
                                      onFocus={() => setActivePartsDropdown(row.id)}
                                      onBlur={() => {
                                        setTimeout(() => setActivePartsDropdown(null), 150)
                                      }}
                                      className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                      placeholder="Search or type part"
                                    />
                                    {activePartsDropdown === row.id && filteredParts(currentValue).length > 0 && (
                                      <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-80 max-w-[90vw] overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
                                        {filteredParts(currentValue).map((part) => (
                                          <button
                                            key={part.part_id}
                                            type="button"
                                            onMouseDown={(e) => {
                                              e.preventDefault()
                                              const partsDescCol = columns.find((col) => String(col.header || '').toUpperCase() === 'PARTS DESCRIPTION')
                                              const partsQtyCol = columns.find((col) => String(col.header || '').toUpperCase() === 'PARTS QTY.')
                                              const priceCol = columns.find((col) => String(col.header || '').toUpperCase() === 'PRICE')
                                              const subtotalCol = columns.find((col) => String(col.header || '').toUpperCase() === 'SUBTOTAL')
                                              
                                              const nextValues = { ...row.values }
                                              if (partsDescCol) nextValues[partsDescCol.key] = part.name
                                              if (partsQtyCol) nextValues[partsQtyCol.key] = 1
                                              if (priceCol) nextValues[priceCol.key] = part.price
                                              if (subtotalCol) {
                                                const partsQty = 1
                                                const price = Number(part.price || 0)
                                                nextValues[subtotalCol.key] = partsQty * price
                                              }
                                              
                                              setRows((currentRows) =>
                                                currentRows.map((r) => {
                                                  if (r.id !== row.id) return r
                                                  return { ...r, values: nextValues }
                                                })
                                              )
                                              setActivePartsDropdown(null)
                                            }}
                                            className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                                          >
                                            <div className="font-semibold">{part.name}</div>
                                            <div className="text-[10px] text-gray-500">{part.description}</div>
                                            <div className="text-[10px] text-gray-400">Price: {part.price}</div>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              ) : isDateInputColumn ? (
                                <input
                                  type="date"
                                  value={currentValue || ''}
                                  onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                  className="w-full rounded border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                />
                              ) : isVatColumn ? (
                                <div className="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                                  {formatDecimalValue(currentValue)}
                                </div>
                              ) : isQtyInputColumn ? (
                                (() => {
                                  const fieldKey = `${row.id}-${col.key}`
                                  const isFocused = focusedNumericField === fieldKey
                                  return (
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={isFocused ? String(currentValue) : formatQuantityInput(currentValue)}
                                      onChange={(e) => {
                                        const nextValue = e.target.value.replace(/[^0-9]/g, '')
                                        handleCellChange(
                                          row.id,
                                          col.key,
                                          nextValue === '' ? 0 : Number(nextValue),
                                        )
                                      }}
                                      onFocus={() => setFocusedNumericField(fieldKey)}
                                      onBlur={(e) => {
                                        setFocusedNumericField(null)
                                        const formatted = formatQuantityInput(currentValue)
                                        handleCellChange(row.id, col.key, parseDecimalInput(formatted))
                                      }}
                                      className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                      placeholder="0"
                                    />
                                  )
                                })()
                              ) : isMoneyInputColumn ? (
                                (() => {
                                  const fieldKey = `${row.id}-${col.key}`
                                  const isFocused = focusedNumericField === fieldKey
                                  return (
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={isFocused ? String(currentValue) : formatNumberInput(currentValue)}
                                      onChange={(e) => {
                                        const nextValue = e.target.value.replace(/[^0-9.]/g, '')
                                        handleCellChange(row.id, col.key, nextValue === '' ? 0 : Number(nextValue))
                                      }}
                                      onFocus={() => setFocusedNumericField(fieldKey)}
                                      onBlur={(e) => {
                                        setFocusedNumericField(null)
                                        const formatted = formatNumberInput(currentValue)
                                        handleCellChange(row.id, col.key, parseDecimalInput(formatted))
                                      }}
                                      className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                      placeholder="0.00"
                                    />
                                  )
                                })()
                              ) : isTotalField ? (
                                <span className="block w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                                  {formatDecimalValue(getComputedSalesTotal(row.values, columns))}
                                </span>
                              ) : isServiceColumn ? (
                                <div className="flex items-center justify-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentValue)}
                                    onChange={(e) => handleCellChange(row.id, col.key, e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                                  />
                                </div>
                              ) : isNameField ? (
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={currentValue}
                                    onChange={(e) => {
                                      handleCellChange(row.id, col.key, e.target.value)
                                      setActiveStoreDropdown(`${row.id}-${col.key}`)
                                    }}
                                    onFocus={() => setActiveStoreDropdown(`${row.id}-${col.key}`)}
                                    onBlur={() => {
                                      setTimeout(() => setActiveStoreDropdown(null), 200)
                                    }}
                                    className="w-full rounded border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                    placeholder="Store name"
                                  />
                                  {activeStoreDropdown === `${row.id}-${col.key}` && filteredStores(currentValue).length > 0 && (
                                    <div 
                                      className="absolute left-0 top-full z-20 mt-1 max-h-52 w-80 max-w-[90vw] overflow-y-auto rounded border border-gray-200 bg-white shadow-lg"
                                      onMouseDown={(e) => e.preventDefault()}
                                    >
                                      {filteredStores(currentValue).map((store) => (
                                        <button
                                          key={store.store_id}
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            handleCellChange(row.id, col.key, store.name)
                                            // Auto-fill store number if column exists
                                            const storeNumberCol = columns.find((c) => String(c.header || '').toUpperCase() === 'STORE NO.' || String(c.header || '').toUpperCase() === 'STORE NUMBER')
                                            if (storeNumberCol) {
                                              handleCellChange(row.id, storeNumberCol.key, store.number)
                                            }
                                            setActiveStoreDropdown(null)
                                          }}
                                          className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                                        >
                                          <div className="font-semibold">{store.name}</div>
                                          <div className="text-[10px] text-gray-500">{store.number}</div>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : isNumericField ? (
                                (() => {
                                  const fieldKey = `${row.id}-${col.key}`
                                  const isFocused = focusedNumericField === fieldKey
                                  return (
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={isFocused ? String(currentValue) : formatNumberInput(currentValue)}
                                      onChange={(e) => {
                                        const nextValue = e.target.value.replace(/[^0-9.]/g, '')
                                        handleCellChange(row.id, col.key, nextValue === '' ? 0 : Number(nextValue))
                                      }}
                                      onFocus={() => setFocusedNumericField(fieldKey)}
                                      onBlur={(e) => {
                                        setFocusedNumericField(null)
                                        const formatted = formatNumberInput(currentValue)
                                        handleCellChange(row.id, col.key, parseDecimalInput(formatted))
                                      }}
                                      className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                      placeholder="0.00"
                                    />
                                  )
                                })()
                              ) : (
                                <input
                                  type="text"
                                  value={currentValue}
                                  onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                  className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-400"
                                  placeholder={typeof col.header === 'object' ? col.header.header || col.header.key || String(col.key) : String(col.header || col.key)}
                                />
                              )}
                            </td>
                          )
                        })}
                        <td className="w-0 px-0 py-2 overflow-hidden transition-all duration-200 group-hover:w-12 group-hover:px-0 group-focus-within:w-12 group-focus-within:px-0">
                          <div className="flex h-full items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border cursor-pointer text-white bg-red-600 opacity-0 transition-all duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
                              aria-label="Delete row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {hasPartsColumns && (addPartRowVisible === row.id || addPartRowHiding === row.id) && (
                      <tr 
                        data-row-id={row.id}
                        onMouseEnter={() => handleRowMouseEnter(row.id)}
                        onMouseLeave={() => handleRowMouseLeave()}
                        className={`add-part-row ${addPartRowVisible === row.id ? 'visible' : addPartRowHiding === row.id ? 'hiding' : ''}`}
                      >
                        <td colSpan={columns.length + 1} className="px-6 py-2 bg-gray-50">
                          <button
                            onClick={() => addPart(row.id)}
                            className="inline-flex items-center rounded border border-green-200 bg-green-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-green-700 transition-colors hover:bg-green-100"
                          >
                            + Add Part
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-6 py-12 text-center text-xs font-medium text-gray-400 uppercase tracking-widest"
                >
                  No tracking records discovered matching selection filters.
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={columns.length + 1} className="px-6 py-3">
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center rounded border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-700 transition-colors hover:bg-red-100"
                  >
                    + Add Row
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/30 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-[11px] text-gray-400 lg:shrink-0">
        <span>{footerLabel}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px]">{footerMeta}</span>
        </div>
      </div>
    </div>
  )
})

const ItemizedPartsTable = ({ statementId, documentMeta, onSave, initialRows, saving, onTotalsChange }) => {
  const [rows, setRows] = useState(() => {
    if (Array.isArray(initialRows) && initialRows.length > 0) {
      return initialRows.map((r, i) => ({
        id: r.id || `row-${i + 1}`,
        values: r.values || r,
        parts: r.parts || [],
      }))
    }
    return [{ 
      id: 'row-1', 
      values: { 
        invoice: '', 
        storeNumber: '', 
        storeName: '', 
        ticketNumber: '', 
        description: '', 
        servicesDate: '', 
        workDone: 'REPAIR AND MAINTENANCE',
        totalInvoiceAmount: 0 
      }, 
      parts: [] 
    }]
  })
  const [parts, setParts] = useState([])
  const [loadingParts, setLoadingParts] = useState(true)
  const [activePartsDropdown, setActivePartsDropdown] = useState(null)

  // Fetch parts on component mount
  React.useEffect(() => {
    const fetchParts = async () => {
      try {
        const response = await apiClient.get('/parts')
        const partsData = response.data.data || []
        setParts(partsData)
      } catch (error) {
        console.error('Error fetching parts:', error)
      } finally {
        setLoadingParts(false)
      }
    }
    fetchParts()
  }, [])

  const filteredParts = (searchTerm) => {
    if (!searchTerm || searchTerm.trim() === '') return parts
    return parts.filter((part) => 
      String(part.name).toLowerCase().includes(String(searchTerm).toLowerCase()) ||
      String(part.description).toLowerCase().includes(String(searchTerm).toLowerCase())
    )
  }

  const handleRowChange = (rowId, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const newValues = { ...row.values, [field]: value }
          return { ...row, values: newValues }
        }
        return row
      }),
    )
  }

  const handlePartChange = (rowId, partId, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const updatedParts = row.parts.map((part) => {
            if (part.id === partId) {
              const newPartValues = { ...part.values, [field]: value }
              
              // Auto-compute subtotal
              if (field === 'partsQty' || field === 'price') {
                const partsQty = Number(newPartValues.partsQty || 0)
                const price = Number(newPartValues.price || 0)
                newPartValues.subtotal = partsQty * price
              }
              
              return { ...part, values: newPartValues }
            }
            return part
          })
          
          // Recalculate total invoice amount
          const totalInvoiceAmount = updatedParts.reduce((sum, part) => sum + (Number(part.values.subtotal) || 0), 0)
          
          return { ...row, parts: updatedParts, values: { ...row.values, totalInvoiceAmount } }
        }
        return row
      }),
    )
  }

  const handlePartSelect = (rowId, partId, part) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const updatedParts = row.parts.map((partItem) => {
            if (partItem.id === partId) {
              const newPartValues = {
                ...partItem.values,
                partsDescription: part.name,
                partsQty: 1,
                price: part.price,
                subtotal: Number(part.price || 0)
              }
              return { ...partItem, values: newPartValues }
            }
            return partItem
          })
          
          // Recalculate total invoice amount
          const totalInvoiceAmount = updatedParts.reduce((sum, part) => sum + (Number(part.values.subtotal) || 0), 0)
          
          return { ...row, parts: updatedParts, values: { ...row.values, totalInvoiceAmount } }
        }
        return row
      }),
    )
  }

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { 
        id: `row-${prev.length + 1}`, 
        values: { 
          invoice: '', 
          storeNumber: '', 
          storeName: '', 
          ticketNumber: '', 
          description: '', 
          servicesDate: '', 
          workDone: 'REPAIR AND MAINTENANCE',
          totalInvoiceAmount: 0 
        }, 
        parts: [] 
      },
    ])
  }

  const addPart = (rowId) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const newPart = {
            id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            values: { partsDescription: '', partsQty: 0, price: 0, subtotal: 0 }
          }
          return { ...row, parts: [...row.parts, newPart] }
        }
        return row
      }),
    )
  }

  const removePart = (rowId, partId) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const updatedParts = row.parts.filter((part) => part.id !== partId)
          const totalInvoiceAmount = updatedParts.reduce((sum, part) => sum + (Number(part.values.subtotal) || 0), 0)
          return { ...row, parts: updatedParts, values: { ...row.values, totalInvoiceAmount } }
        }
        return row
      }),
    )
  }

  const removeRow = (rowId) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId))
  }

  const handleSave = () => {
    // Flatten rows with parts for saving
    const flattenedRows = rows.flatMap((row) => {
      if (row.parts.length === 0) {
        return [{ ...row, parts: undefined }]
      }
      // First row has full data, subsequent parts rows only have parts data
      return row.parts.map((part, idx) => ({
        id: idx === 0 ? row.id : `${row.id}-part-${part.id}`,
        values: idx === 0 ? { ...row.values, ...part.values } : { ...part.values },
        isPartRow: idx > 0,
        parentRowId: row.id,
      }))
    })
    
    onSave?.(flattenedRows, [
      { label: 'INVOICE' }, 
      { label: 'STORE NUMBER' }, 
      { label: 'STORE NAME' }, 
      { label: 'TICKET NUMBER' }, 
      { label: 'DESCRIPTION' }, 
      { label: 'SERVICES DATE' }, 
      { label: 'WORK DONE' }, 
      { label: 'PARTS DESCRIPTION' }, 
      { label: 'PARTS QTY.' }, 
      { label: 'PRICE' }, 
      { label: 'SUBTOTAL' }, 
      { label: 'TOTAL INVOICE AMOUNT' }
    ], { 
      vatMode: false, 
      quantityMode: false,
      soa_sub_total: subTotal,
      soa_vat: vat,
      soa_total: total,
    })
  }

  // Calculate totals
  const subTotal = rows.reduce((sum, row) => sum + (Number(row.values.totalInvoiceAmount) || 0), 0)
  const vat = Number((subTotal * 0.12).toFixed(2))
  const total = Number((subTotal + vat).toFixed(2))

  React.useEffect(() => {
    onTotalsChange?.({ subTotal, vat, total })
  }, [subTotal, vat, total, onTotalsChange])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-700">
          Itemized Parts & Repair
        </h3>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center rounded border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-red-700 transition-colors hover:bg-red-100"
        >
          + Add Store Row
        </button>
      </div>
      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="border-b border-gray-100 bg-red-600 text-white text-[9px] font-bold uppercase tracking-widest">
            <th className="px-4 py-3">INVOICE</th>
            <th className="px-4 py-3">STORE NUMBER</th>
            <th className="px-4 py-3">STORE NAME</th>
            <th className="px-4 py-3">TICKET NUMBER</th>
            <th className="px-4 py-3">DESCRIPTION</th>
            <th className="px-4 py-3">SERVICES DATE</th>
            <th className="px-4 py-3">WORK DONE</th>
            <th className="px-4 py-3">PARTS DESCRIPTION</th>
            <th className="px-4 py-3">PARTS QTY.</th>
            <th className="px-4 py-3">PRICE</th>
            <th className="px-4 py-3">SUBTOTAL</th>
            <th className="px-4 py-3">TOTAL INVOICE AMOUNT</th>
            <th className="px-4 py-3 w-0"></th>
          </tr>
        </thead>
        <tbody className="text-xs font-medium text-gray-700">
          {rows.map((row, rowIdx) => (
            <React.Fragment key={row.id}>
              {row.parts.length === 0 ? (
                // Row without parts
                <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={row.values.invoice || ''}
                      onChange={(e) => handleRowChange(row.id, 'invoice', e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={row.values.storeNumber || ''}
                      onChange={(e) => handleRowChange(row.id, 'storeNumber', e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={row.values.storeName || ''}
                      onChange={(e) => handleRowChange(row.id, 'storeName', e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={row.values.ticketNumber || ''}
                      onChange={(e) => handleRowChange(row.id, 'ticketNumber', e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={row.values.description || ''}
                      onChange={(e) => handleRowChange(row.id, 'description', e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      value={row.values.servicesDate || ''}
                      onChange={(e) => handleRowChange(row.id, 'servicesDate', e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={row.values.workDone || 'REPAIR AND MAINTENANCE'}
                      onChange={(e) => handleRowChange(row.id, 'workDone', e.target.value)}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                    />
                  </td>
                  <td className="px-4 py-2 bg-green-50 border-2 border-green-300">
                    <button
                      onClick={() => addPart(row.id)}
                      className="w-full inline-flex items-center justify-center rounded bg-green-600 text-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-green-700 shadow-md"
                    >
                      + Add Part
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value=""
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-gray-50"
                      disabled
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value=""
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-gray-50"
                      disabled
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value=""
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs bg-gray-50"
                      disabled
                    />
                  </td>
                  <td className="px-4 py-2 font-mono">
                    {formatCurrency(row.values.totalInvoiceAmount || 0)}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => addPart(row.id)}
                      className="inline-flex items-center rounded bg-green-600 text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-green-700 mr-2"
                    >
                      + Add Part
                    </button>
                    <button
                      onClick={() => removeRow(row.id)}
                      className="text-red-500 hover:text-red-700"
                      disabled={rows.length === 1}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ) : (
                // Row with parts - render each part with row spanning
                row.parts.map((part, partIdx) => (
                  <tr key={part.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    {partIdx === 0 && (
                      <>
                        <td rowSpan={row.parts.length} className="px-4 py-2 border-r border-gray-200">
                          <input
                            type="text"
                            value={row.values.invoice || ''}
                            onChange={(e) => handleRowChange(row.id, 'invoice', e.target.value)}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                          />
                        </td>
                        <td rowSpan={row.parts.length} className="px-4 py-2 border-r border-gray-200">
                          <input
                            type="text"
                            value={row.values.storeNumber || ''}
                            onChange={(e) => handleRowChange(row.id, 'storeNumber', e.target.value)}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                          />
                        </td>
                        <td rowSpan={row.parts.length} className="px-4 py-2 border-r border-gray-200">
                          <input
                            type="text"
                            value={row.values.storeName || ''}
                            onChange={(e) => handleRowChange(row.id, 'storeName', e.target.value)}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                          />
                        </td>
                        <td rowSpan={row.parts.length} className="px-4 py-2 border-r border-gray-200">
                          <input
                            type="text"
                            value={row.values.ticketNumber || ''}
                            onChange={(e) => handleRowChange(row.id, 'ticketNumber', e.target.value)}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                          />
                        </td>
                        <td rowSpan={row.parts.length} className="px-4 py-2 border-r border-gray-200">
                          <input
                            type="text"
                            value={row.values.description || ''}
                            onChange={(e) => handleRowChange(row.id, 'description', e.target.value)}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                          />
                        </td>
                        <td rowSpan={row.parts.length} className="px-4 py-2 border-r border-gray-200">
                          <input
                            type="date"
                            value={row.values.servicesDate || ''}
                            onChange={(e) => handleRowChange(row.id, 'servicesDate', e.target.value)}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                          />
                        </td>
                        <td rowSpan={row.parts.length} className="px-4 py-2 border-r border-gray-200">
                          <input
                            type="text"
                            value={row.values.workDone || 'REPAIR AND MAINTENANCE'}
                            onChange={(e) => handleRowChange(row.id, 'workDone', e.target.value)}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                          />
                        </td>
                      </>
                    )}
                    <td className="px-4 py-2">
                      {loadingParts ? (
                        <input
                          type="text"
                          value={part.values.partsDescription || ''}
                          onChange={(e) => handlePartChange(row.id, part.id, 'partsDescription', e.target.value)}
                          className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                          placeholder="Loading parts..."
                          disabled
                        />
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            value={part.values.partsDescription || ''}
                            onChange={(e) => {
                              handlePartChange(row.id, part.id, 'partsDescription', e.target.value)
                              setActivePartsDropdown(`${row.id}-${part.id}`)
                            }}
                            onFocus={() => setActivePartsDropdown(`${row.id}-${part.id}`)}
                            onBlur={() => {
                              setTimeout(() => setActivePartsDropdown(null), 150)
                            }}
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                            placeholder="Search or type part"
                          />
                          {activePartsDropdown === `${row.id}-${part.id}` && filteredParts(part.values.partsDescription).length > 0 && (
                            <div className="absolute left-0 top-full z-20 mt-1 max-h-52 w-80 max-w-[90vw] overflow-y-auto rounded border border-gray-200 bg-white shadow-lg">
                              {filteredParts(part.values.partsDescription).map((partData) => (
                                <button
                                  key={partData.part_id}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault()
                                    handlePartSelect(row.id, part.id, partData)
                                    setActivePartsDropdown(null)
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100"
                                >
                                  <div className="font-semibold">{partData.name}</div>
                                  <div className="text-[10px] text-gray-500">{partData.description}</div>
                                  <div className="text-[10px] text-gray-400">Price: {partData.price}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={part.values.partsQty || 0}
                        onChange={(e) => handlePartChange(row.id, part.id, 'partsQty', e.target.value)}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                        min="0"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={part.values.price || 0}
                        onChange={(e) => handlePartChange(row.id, part.id, 'price', e.target.value)}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {formatCurrency(part.values.subtotal || 0)}
                    </td>
                    {partIdx === 0 && (
                      <>
                        <td rowSpan={row.parts.length} className="px-4 py-2 font-mono border-l border-gray-200">
                          {formatCurrency(row.values.totalInvoiceAmount || 0)}
                        </td>
                        <td rowSpan={row.parts.length} className="px-4 py-2">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => addPart(row.id)}
                              className="text-green-600 hover:text-green-700 text-[10px]"
                            >
                              + Add Part
                            </button>
                            <button
                              onClick={() => removeRow(row.id)}
                              className="text-red-500 hover:text-red-700"
                              disabled={rows.length === 1}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                    {partIdx > 0 && (
                      <td className="px-4 py-2">
                        <button
                          onClick={() => removePart(row.id, part.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function StatementDetails() {
  const match = useMatch('/statement/$id')
  const location = useLocation()
  const navigate = useNavigate()

  const statementIdFromRoute = match?.params?.id
  const statementId =
    statementIdFromRoute ||
    (location.pathname.split('/').filter(Boolean)[1] || '').replace(/\?.*$/, '')

  const [statement, setStatement] = useState(null)
  const [companies, setCompanies] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const [savingRows, setSavingRows] = useState(false)
  const [initialRows, setInitialRows] = useState([])
  const [vatPerRow, setVatPerRow] = useState(false)
  const [quantityMode, setQuantityMode] = useState('off')
  const [serviceQuantitySelection, setServiceQuantitySelection] = useState({})
  const [includeDrNo, setIncludeDrNo] = useState(true)
  const [includeRtNo, setIncludeRtNo] = useState(true)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfBlob, setPdfBlob] = useState(null)
  const [showSubtotal, setShowSubtotal] = useState(true)
  const [showVat, setShowVat] = useState(true)
  const [showTotal, setShowTotal] = useState(true)
  const tableRef = useRef(null)
  const [liveMeta, setLiveMeta] = useState({ subTotal: 0, vat: 0, total: 0 })

  // The one and only source of truth for "this service actually has saved
  // quantity data" — read straight from the persisted row values (keys
  // ending in "_qty"), never from header text.
  const savedQuantitySelection = useMemo(() => {
    const selection = new Set()
    initialRows.forEach((row) => {
      const values = row?.values || row || {}
      Object.keys(values || {}).forEach((key) => {
        if (!key) return
        const normalized = normalizeHeaderKey(key)
        if (normalized.endsWith('_qty')) {
          selection.add(normalized.replace(/_qty$/, ''))
        }
      })
    })
    return selection
  }, [initialRows])

  const showToast = (type, message) => setToast({ type, message })

  const formatHeaderLabel = (header = '') =>
    String(header ?? '')
      .trim()
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const loadCompanies = async () => {
    try {
      const response = await apiClient.get('/company')
      const companyList = (response.data?.data || []).map((item) => ({
        id: item.mc_id ?? item.company_id ?? item.id ?? item.companyId,
        name: item.mc_name ?? item.name ?? item.company_name ?? item.companyName,
        address:
          item.mc_address ?? item.address ?? item.company_address ?? item.companyAddress ?? '',
        mobile:
          item.mc_mobile_number ?? item.mobile_number ?? item.mobile ?? item.company_mobile ?? '',
        phone:
          item.mc_telephone_number ??
          item.telephone_number ??
          item.phone ??
          item.phone_number ??
          item.company_phone ??
          '',
      }))
      setCompanies(companyList.filter((company) => company.id))
    } catch (err) {
      // Graceful fallback to raw data references inside view
    }
  }

  const loadServices = async () => {
    try {
      const response = await apiClient.get('/service')
      const serviceList = (response.data?.data || []).map((item) => ({
        id: item.service_id ?? item.id,
        name: item.name ?? '',
        price: Number(item.price || 0),
      }))
      setServices(serviceList)
    } catch (err) {
      setServices([])
    }
  }

  const loadStatementDetails = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/statement/${statementId}`)
      const statementData = response.data?.data || null
      setStatement(statementData)
      
      // Load service quantity selection from saved statement
      if (statementData?.soa_service_quantity_selection) {
        try {
          const parsedSelection = typeof statementData.soa_service_quantity_selection === 'string' 
            ? JSON.parse(statementData.soa_service_quantity_selection) 
            : statementData.soa_service_quantity_selection
          setServiceQuantitySelection(parsedSelection || {})
          if (Object.keys(parsedSelection || {}).length > 0) {
            setQuantityMode('add')
          }
        } catch (err) {
          console.error('Error parsing service quantity selection:', err)
          setServiceQuantitySelection({})
        }
      }
      
      // load saved items for this statement (if any)
      try {
        const itemsResp = await apiClient.get(`/statement/${statementId}/items`)
        setInitialRows(itemsResp.data?.data || [])
      } catch (err) {
        setInitialRows([])
      }
      setError('')
    } catch (err) {
      setError('Unable to securely sync financial statement parameters.')
      setStatement(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (statementId) {
      loadServices()
      loadStatementDetails()
      loadCompanies()
    }
  }, [statementId])

  // Initialize DR NO / RT NO flags from stored headers
  useEffect(() => {
    if (statement?.soa_headers) {
      let rawHeaders = []
      if (Array.isArray(statement.soa_headers)) {
        rawHeaders = statement.soa_headers
      } else if (typeof statement.soa_headers === 'string') {
        const trimmed = statement.soa_headers.trim()
        try {
          const parsed = JSON.parse(trimmed)
          rawHeaders = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          rawHeaders = trimmed
            .split(',')
            .map((h) => h.trim())
            .filter(Boolean)
        }
      }

      const { hasDrNo, hasRtNo } = parseExistingHeaderFlags(rawHeaders)
      setIncludeDrNo(hasDrNo)
      setIncludeRtNo(hasRtNo)
    }
  }, [statement?.soa_headers])

  const handleSaveRows = async (rows = [], columns = [], options = {}) => {
    if (!statementId) return

    try {
      setSavingRows(true)
      const fieldNames = columns
        .filter((column) => column.key !== 'vat')
        .map((column) => column.key || column.header)
      const headerNames = columns
        .filter((column) => column.key !== 'vat')
        .map((column) => {
          if (column.quantityMeta?.relatedServiceKey) {
            const relatedService = columns.find(
              (col) =>
                col.key === column.quantityMeta.relatedServiceKey ||
                col.serviceMeta?.serviceId === column.quantityMeta.relatedServiceKey ||
                normalizeServiceId(col.header) ===
                  normalizeServiceId(column.quantityMeta.relatedServiceKey),
            )
            const relatedName = relatedService?.header || column.quantityMeta.relatedServiceKey
            return `QTY (${formatHeaderLabel(relatedName)})`
          }

          const baseHeader = String(column.header || column.key || '')
          return formatHeaderLabel(baseHeader)
        })
      const useQuantity = Boolean(
        options.quantityMode ||
        Object.values(serviceQuantitySelection).some(Boolean) ||
        columns.some((column) => isQuantityColumn(column)),
      )
      const sanitizedRows = rows.map((row) => {
        const values = { ...(row.values || row || {}) }
        if (!useQuantity) {
          Object.keys(values).forEach((key) => {
            if (normalizeServiceId(key).trim().toLowerCase().endsWith('_qty')) {
              delete values[key]
            }
          })
        }
        return {
          ...row,
          values,
        }
      })

      const response = await apiClient.post(`/statement/${statementId}/items`, {
        rows: sanitizedRows,
        fieldNames,
        headerNames,
        vatMode: Boolean(options.vatMode || vatPerRow),
        quantityMode: useQuantity,
        soa_sub_total: options.soa_sub_total,
        soa_vat: options.soa_vat,
        soa_total: options.soa_total,
        headers: columns.map(col => ({
          key: col.key,
          header: col.header
        })),
        columnMeta: columns
          .filter((column) => column.key && (column.serviceMeta || column.quantityMeta))
          .map((column) => ({
            key: column.key,
            header: column.header,
            serviceMeta: column.serviceMeta
              ? {
                  serviceId: column.serviceMeta.serviceId,
                  serviceName: column.serviceMeta.serviceName,
                  servicePrice: Number(column.serviceMeta.servicePrice || 0),
                }
              : null,
            quantityMeta: column.quantityMeta
              ? {
                  relatedServiceKey: column.quantityMeta.relatedServiceKey,
                }
              : null,
          })),
        serviceQuantitySelection: serviceQuantitySelection,
      })

      if (response.data?.success) {
        showToast('success', response.data?.message || 'Statement rows saved successfully.')
        setStatement((currentStatement) =>
          currentStatement
            ? {
                ...currentStatement,
                soa_sub_total: response.data?.data?.subTotal ?? currentStatement.soa_sub_total,
                soa_vat: response.data?.data?.vat ?? currentStatement.soa_vat,
                soa_total: response.data?.data?.total ?? currentStatement.soa_total,
                soa_headers: response.data?.data?.headers ?? currentStatement.soa_headers,
              }
            : currentStatement,
        )
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to save statement rows at this time.'
      showToast('error', message)
      setError(message)
    } finally {
      setSavingRows(false)
    }
  }

  const companyMap = useMemo(() => {
    const map = {}
    companies.forEach((company) => {
      if (company.id) {
        map[company.id] = {
          name: company.name || company.id,
          address: company.address || '',
          mobile: company.mobile || '',
          phone: company.phone || '',
        }
      }
    })
    return map
  }, [companies])

  const handleServiceQuantityChange = (serviceKey, enabled) => {
    const normalized = normalizeHeaderKey(serviceKey)
    setServiceQuantitySelection((current) => ({
      ...current,
      [normalized]: Boolean(enabled),
    }))
  }

  const handleQuantityModeChange = (enabled) => {
    setQuantityMode(enabled ? 'add' : 'off')
    // Turning "Add Qty" on/off never pre-selects any service — the user
    // must explicitly check which service(s) need a QTY column.
    setServiceQuantitySelection({})
  }

  // Parse existing headers to detect DR NO and RT NO inclusion
  const parseExistingHeaderFlags = (rawHeaders = []) => {
    const normalizeHeaderKey = (header = '') =>
      String(header ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')

    const hasDrNo = rawHeaders.some((header) => normalizeHeaderKey(header) === 'drno')
    const hasRtNo = rawHeaders.some((header) => normalizeHeaderKey(header) === 'rtno')

    return { hasDrNo, hasRtNo }
  }

  // Rebuild headers by toggling DR NO and RT NO
  const rebuildHeadersWithToggle = (currentHeaders = [], newIncludeDrNo, newIncludeRtNo) => {
    const normalizeHeaderKey = (header = '') =>
      String(header ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')

    // Filter out DR NO and RT NO from current headers
    const filtered = currentHeaders.filter((header) => {
      const normalized = normalizeHeaderKey(header)
      return normalized !== 'drno' && normalized !== 'rtno'
    })

    // Find the position after NO. to insert DR NO and RT NO
    const noIndex = filtered.findIndex((h) => normalizeHeaderKey(h) === 'no')
    if (noIndex === -1) return filtered

    const result = [...filtered]
    let insertPos = noIndex + 1

    if (newIncludeDrNo) {
      result.splice(insertPos, 0, 'DR NO.')
      insertPos++
    }
    if (newIncludeRtNo) {
      result.splice(insertPos, 0, 'RT NO.')
      insertPos++
    }

    return result
  }

  // Handle toggling DR NO inclusion
  const handleToggleDrNo = (checked) => {
    setIncludeDrNo(checked)
    if (statement?.soa_headers) {
      let rawHeaders = []
      if (Array.isArray(statement.soa_headers)) {
        rawHeaders = statement.soa_headers
      } else if (typeof statement.soa_headers === 'string') {
        const trimmed = statement.soa_headers.trim()
        try {
          const parsed = JSON.parse(trimmed)
          rawHeaders = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          rawHeaders = trimmed
            .split(',')
            .map((h) => h.trim())
            .filter(Boolean)
        }
      }

      const newHeaders = rebuildHeadersWithToggle(rawHeaders, checked, includeRtNo)
      setStatement((prev) => ({
        ...prev,
        soa_headers: newHeaders,
      }))
    }
  }

  // Handle toggling RT NO inclusion
  const handleToggleRtNo = (checked) => {
    setIncludeRtNo(checked)
    if (statement?.soa_headers) {
      let rawHeaders = []
      if (Array.isArray(statement.soa_headers)) {
        rawHeaders = statement.soa_headers
      } else if (typeof statement.soa_headers === 'string') {
        const trimmed = statement.soa_headers.trim()
        try {
          const parsed = JSON.parse(trimmed)
          rawHeaders = Array.isArray(parsed) ? parsed : [parsed]
        } catch {
          rawHeaders = trimmed
            .split(',')
            .map((h) => h.trim())
            .filter(Boolean)
        }
      }

      const newHeaders = rebuildHeadersWithToggle(rawHeaders, includeDrNo, checked)
      setStatement((prev) => ({
        ...prev,
        soa_headers: newHeaders,
      }))
    }
  }

  // Extract dynamic headers from schema array or string parameters
  const dynamicTableColumns = useMemo(() => {
    if (!statement?.soa_headers) return []

    let rawHeaders = []
    if (Array.isArray(statement.soa_headers)) {
      rawHeaders = statement.soa_headers.map(h => typeof h === 'object' ? (h.header || h.key || h) : h)
    } else if (typeof statement.soa_headers === 'string') {
      const trimmed = statement.soa_headers.trim()
      try {
        const parsed = JSON.parse(trimmed)
        rawHeaders = Array.isArray(parsed) ? parsed.map(h => typeof h === 'object' ? (h.header || h.key || h) : h) : [typeof parsed === 'object' ? (parsed.header || parsed.key || parsed) : parsed]
      } catch {
        rawHeaders = trimmed
          .split(',')
          .map((h) => h.trim())
          .filter(Boolean)
      }
    }

    const columns = []
    const seenColumnKeys = new Set()
    const toSlug = (value = '') =>
      String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')

    const getUniqueColumnKey = (baseKey = '', fallbackIndex = 0) => {
      const normalizedBase = toSlug(baseKey) || `column_${fallbackIndex}`
      let candidate = normalizedBase
      let suffix = 2
      while (seenColumnKeys.has(candidate)) {
        candidate = `${normalizedBase}_${suffix}`
        suffix += 1
      }
      seenColumnKeys.add(candidate)
      return candidate
    }

    // Quantity columns are derived EXCLUSIVELY from the per-service
    // checkbox selection below (serviceQuantitySelection). Legacy header
    // entries like "Qty (Renovation)" or a bare "Qty"/"Quantity" are
    // ignored here entirely — they used to be a second, independent path
    // that could add a duplicate QTY column alongside the checkbox path.
    rawHeaders
      .filter((headerText) => {
        const normalizedHeader = String(typeof headerText === 'object' ? (headerText.header || headerText.key || headerText) : headerText).trim().toLowerCase()
        return (
          normalizedHeader !== '%vat' &&
          normalizedHeader !== 'vat' &&
          normalizedHeader !== 'qty' &&
          normalizedHeader !== 'quantity' &&
          !/^(qty|quantity)\s*\(/i.test(normalizedHeader)
        )
      })
      .forEach((headerText, index) => {
        const normalizedHeaderText = typeof headerText === 'object' ? (headerText.header || headerText.key || headerText) : headerText
        const normalizedServiceHeader = normalizeServiceId(normalizedHeaderText)
        const serviceMatch = services.find((service) => {
          const serviceId = normalizeServiceId(service.id)
          const serviceName = normalizeServiceId(service.name)
          return serviceId === normalizedServiceHeader || serviceName === normalizedServiceHeader
        })

        const baseKey = getUniqueColumnKey(normalizedServiceHeader || normalizedHeaderText, index)
        const serviceKey = serviceMatch
          ? normalizeHeaderKey(serviceMatch.name || serviceMatch.id)
          : normalizeHeaderKey(baseKey)

        columns.push({
          key: baseKey,
          header: String(serviceMatch?.name || (typeof headerText === 'object' ? headerText.header || headerText.key || headerText : headerText)),
          align: 'left',
          render: () => <span className="text-gray-400 font-mono">—</span>,
          serviceMeta: serviceMatch
            ? {
                serviceId: normalizeServiceId(serviceMatch.id),
                serviceName: serviceMatch.name || (typeof headerText === 'object' ? headerText.header || headerText.key || headerText : headerText),
                servicePrice: Number(serviceMatch.price || 0),
                serviceKey,
              }
            : null,
        })

        // Add exactly one QTY column for this service, and only when the
        // user has checked its box in the "Add Qty" panel.
        const isQtyCheckedForThisService =
          quantityMode === 'add' && Boolean(serviceQuantitySelection?.[serviceKey])

        if (serviceMatch && isQtyCheckedForThisService) {
          columns.push({
            key: getUniqueColumnKey(`${baseKey}_qty`),
            header: 'QTY',
            align: 'center',
            render: () => <span className="text-gray-400 font-mono">—</span>,
            quantityMeta: {
              relatedServiceKey: baseKey,
            },
          })
        }
      })

    return columns
  }, [services, statement?.soa_headers, serviceQuantitySelection, quantityMode])

  const visibleTableColumns = useMemo(() => {
    const baseColumns = dynamicTableColumns
    if (!vatPerRow) return baseColumns

    const hasVatColumn = baseColumns.some(
      (column) =>
        String(column?.key || '').toLowerCase() === 'vat' ||
        String(column?.header || '').toLowerCase() === '%vat' ||
        String(column?.header || '').toLowerCase() === 'vat',
    )

    if (hasVatColumn) return baseColumns

    return [
      ...baseColumns,
      {
        key: 'vat',
        header: '%VAT',
        align: 'right',
        render: () => <span className="text-gray-400 font-mono">—</span>,
      },
    ]
  }, [dynamicTableColumns, vatPerRow])

  // Meta bundle passed down to the table so its Export Excel / Export PDF
  // buttons can reproduce the letterhead → To/Date → Title → Table → Totals
  // → Signatures layout of the original SOA form.
  const parseHeaders = (headers) => {
    if (Array.isArray(headers)) return headers.filter(Boolean)
    if (typeof headers === 'string') {
      const trimmed = headers.trim()
      try {
        const parsed = JSON.parse(trimmed)
        return Array.isArray(parsed) ? parsed.filter(Boolean) : []
      } catch {
        return trimmed
          .split(',')
          .map((header) => header.trim())
          .filter(Boolean)
      }
    }
    return []
  }

  // VAT mode is derived purely from the header schema, every time it changes.
  useEffect(() => {
    if (!statement?.soa_headers) {
      setVatPerRow(false)
      return
    }
    const rawHeaders = parseHeaders(statement.soa_headers)
    const hasVatHeader = rawHeaders.some(
      (header) =>
        String(header).trim().toLowerCase() === '%vat' ||
        String(header).trim().toLowerCase() === 'vat',
    )
    setVatPerRow(hasVatHeader)
  }, [statement?.soa_headers])

  // Seeds the "Add Qty" mode + checkboxes from what was actually saved for
  // this statement (real row data, not header text) — runs once per
  // statement load only, and never re-merges with whatever the user is
  // currently toggling. This is what previously caused every service to
  // silently get re-checked (and thus a duplicate QTY column) any time the
  // header list changed.
  useEffect(() => {
    if (savedQuantitySelection.size > 0) {
      const seeded = Array.from(savedQuantitySelection).reduce((acc, key) => {
        acc[key] = true
        return acc
      }, {})
      setQuantityMode('add')
      setServiceQuantitySelection(seeded)
    } else {
      setQuantityMode('off')
      setServiceQuantitySelection({})
    }
  }, [statementId, savedQuantitySelection])

  const documentMeta = useMemo(
    () => ({
      fromCompany: companyMap[statement?.soa_company_from] || {
        name: statement?.soa_company_from || '',
      },
      toCompany: companyMap[statement?.soa_company_to] || {
        name: statement?.soa_company_to || '',
      },
      title: statement?.soa_title || 'STATEMENT OF ACCOUNT',
      date: formatDateLabel(statement?.soa_date) || statement?.soa_date || '',
      subTotal: statement?.soa_sub_total,
      vat: statement?.soa_vat,
      total: statement?.soa_total,
      statementType: statement?.soa_statement_type || 'SERVICE',
      maintenanceFormat: statement?.soa_maintenance_format || 'REGIONAL_SUMMARY',
    }),
    [statement, companyMap],
  )

  if (loading) {
    return (
      <Layout
        activeItem="statement"
        title="Statement Pipeline"
        user={{ name: 'Administrator', role: 'Admin', initials: 'AD' }}
      >
        <div className="flex items-center justify-center h-[calc(100vh-110px)]">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 animate-pulse">
            Syncing Ledger Parameters...
          </div>
        </div>
      </Layout>
    )
  }

  if (!statement) {
    return (
      <Layout
        activeItem="statement"
        title="Statement Profile Error"
        user={{ name: 'Administrator', role: 'Admin', initials: 'AD' }}
      >
        <div className="mx-auto flex flex-col space-y-4 max-w-4xl">
          <button
            onClick={() => navigate({ to: '/statement' })}
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-red-600 hover:text-red-800 transition-colors w-fit"
          >
            <ChevronLeft size={14} className="stroke-[2.5]" /> Back to Statements Ledger
          </button>
          <div className="rounded border border-red-200 bg-red-50/50 p-4 text-xs font-semibold text-red-700">
            {error ||
              'The requested verification node code index statement is absent from active records.'}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      activeItem="statement"
      title="Statement Analysis"
      user={{ name: 'Administrator', role: 'Admin', initials: 'AD' }}
      notificationCount={3}
    >
      {/* Desktop fixed/Mobile fluid outer wrapper framework */}
      {toast ? (
        <DynamicToast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
          duration={4000}
        />
      ) : null}

      <div className="mx-auto flex flex-col h-auto overflow-visible lg:h-[calc(100vh-110px)] space-y-4 lg:overflow-hidden">
        {/* Top Control Block & Breadcrumb Node */}
        <div className="flex flex-col gap-2 lg:shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
            <span>Audit Desk</span>
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-red-600">Statement Node Details</span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={() => navigate({ to: '/statement' })}
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-black hover:text-red-600 transition-colors w-fit"
            >
              <ChevronLeft size={14} className="stroke-[2.5]" />
              Return to Master File
            </button>

            <div className="mt-2 sm:mt-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => tableRef.current?.saveRows()}
                disabled={savingRows || !statementId}
                className="inline-flex items-center rounded border border-red-200 bg-red-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {savingRows ? 'Saving…' : 'Save Rows'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const blob = await tableRef.current?.generatePdfPreview(showSubtotal, showVat, showTotal)
                    setPdfBlob(blob)
                    setPdfPreviewOpen(true)
                  } catch (err) {
                    console.error('Failed to generate PDF preview:', err)
                  }
                }}
                className="inline-flex items-center rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-700 transition-colors hover:bg-gray-50"
              >
                Export PDF
              </button>

              <button
                type="button"
                onClick={() => tableRef.current?.exportExcel()}
                className="inline-flex items-center rounded border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-700 transition-colors hover:bg-gray-50"
              >
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Brand Master Document Header Panel */}
        <div className="rounded border border-gray-200 bg-white p-6 shadow-sm lg:shrink-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-black text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-black uppercase tracking-wider text-black">
                  {statement.soa_title || 'STATEMENT OF ACCOUNT'}
                </h1>
                <p className="text-[11px] font-bold uppercase tracking-widest text-red-600 mt-0.5">
                  Statement Reference Cycle: {formatDateLabel(statement.soa_date)}
                </p>
              </div>
            </div>
          </div>

          {/* Account Source/Destination Metadata Nodes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded bg-gray-50/60 border border-gray-100 p-4">
              <p className="text-[12px] font-bold tracking-widest text-gray-400">From:</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                <span className="font-bold text-black">
                  {companyMap[statement.soa_company_from]?.name || statement.soa_company_from}
                </span>
                {companyMap[statement.soa_company_from]?.address && (
                  <span>{companyMap[statement.soa_company_from].address}</span>
                )}
                {companyMap[statement.soa_company_from]?.mobile && (
                  <span>Mobile: {companyMap[statement.soa_company_from].mobile}</span>
                )}
                {companyMap[statement.soa_company_from]?.phone && (
                  <span>Phone: {companyMap[statement.soa_company_from].phone}</span>
                )}
              </div>
            </div>
            <div className="rounded bg-gray-50/60 border border-gray-100 p-4">
              <p className="text-[12px] font-bold tracking-widest text-gray-400">To:</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                <span className="font-bold text-black">
                  {companyMap[statement.soa_company_to]?.name || statement.soa_company_to}
                </span>
                {companyMap[statement.soa_company_to]?.address && (
                  <span>{companyMap[statement.soa_company_to].address}</span>
                )}
                {companyMap[statement.soa_company_to]?.mobile && (
                  <span>Mobile: {companyMap[statement.soa_company_to].mobile}</span>
                )}
                {companyMap[statement.soa_company_to]?.phone && (
                  <span>Phone: {companyMap[statement.soa_company_to].phone}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Table Ingestion Section */}
        {documentMeta.statementType === 'MAINTENANCE' ? (
          <>
            {documentMeta.maintenanceFormat === 'REGIONAL_SUMMARY' && (
              <MaintenanceTable
                statementId={statementId}
                documentMeta={documentMeta}
                onSave={handleSaveRows}
                initialRows={initialRows}
                saving={savingRows}
                onTotalsChange={setLiveMeta}
              />
            )}
            {documentMeta.maintenanceFormat === 'ITEMIZED_PARTS' && (
              <ItemizedPartsTable
                statementId={statementId}
                documentMeta={documentMeta}
                onSave={handleSaveRows}
                initialRows={initialRows}
                saving={savingRows}
                onTotalsChange={setLiveMeta}
              />
            )}
            {documentMeta.maintenanceFormat === 'OFFICIAL_INVOICE' && (
              <div className="rounded border border-gray-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                  Official Invoice Format
                </p>
                <div className="text-sm text-gray-600">
                  <p>Official invoice format will be rendered here.</p>
                  <p className="mt-2 text-xs text-gray-500">
                    Format: NO | INVOICE | SERVICE DATE | AREA | SERVICE TYPE | WORK DONE | NO OF STORE | AMOUNT PER STORE | TOTAL VAT-EX | TOTAL VAT-IN
                  </p>
                </div>
              </div>
            )}
          </>
        ) : visibleTableColumns.length > 0 ? (
          <StatementDetailTable
            columns={visibleTableColumns}
            registryLabel="Dynamic Core Statement Schema Columns"
            footerLabel="System Audit Framework Active Verification Matrix"
            footerMeta="Encrypted Node Sync Complete"
            statementId={statementId}
            onSave={handleSaveRows}
            onTotalsChange={setLiveMeta}
            initialRows={initialRows}
            saving={savingRows}
            documentMeta={documentMeta}
            vatPerRow={vatPerRow}
            onVatModeChange={setVatPerRow}
            quantityMode={quantityMode === 'add'}
            onQuantityModeChange={handleQuantityModeChange}
            serviceQuantitySelection={serviceQuantitySelection}
            onServiceQuantityChange={handleServiceQuantityChange}
            includeDrNo={includeDrNo}
            onToggleDrNo={handleToggleDrNo}
            includeRtNo={includeRtNo}
            onToggleRtNo={handleToggleRtNo}
            ref={tableRef}
          />
        ) : (
          <div className="rounded border border-gray-200 border-dashed bg-white p-8 text-center text-xs font-medium text-gray-400 uppercase tracking-widest">
            No table header attributes designated for this statement reference.
          </div>
        )}

        {/* Financial Calculation Balance Grid Block */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:shrink-0">
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Subtotal
            </p>
            <div className="mt-1 text-lg font-black text-black font-mono">
              {formatCurrency(liveMeta.subTotal ?? statement.soa_sub_total)}
            </div>
          </div>
          <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              12% VAT Allocation
            </p>
            <div className="mt-1 text-lg font-black text-black font-mono">
              {formatCurrency(liveMeta.vat ?? statement.soa_vat)}
            </div>
          </div>
          <div className="rounded border border-neutral-900 bg-neutral-950 p-4 shadow-sm text-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Total Amount
            </p>
            <div className="mt-1 text-lg font-black text-red-500 font-mono">
              {formatCurrency(liveMeta.total ?? statement.soa_total)}
            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {pdfPreviewOpen && pdfBlob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full h-[95vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">PDF Preview</h2>
              <button
                onClick={() => setPdfPreviewOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <iframe
                src={URL.createObjectURL(pdfBlob)}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Show in PDF:</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSubtotal}
                      onChange={async (e) => {
                        setShowSubtotal(e.target.checked)
                        try {
                          const blob = await tableRef.current?.generatePdfPreview(e.target.checked, showVat, showTotal)
                          setPdfBlob(blob)
                        } catch (err) {
                          console.error('Failed to regenerate PDF:', err)
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Sub-Total</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showVat}
                      onChange={async (e) => {
                        setShowVat(e.target.checked)
                        try {
                          const blob = await tableRef.current?.generatePdfPreview(showSubtotal, e.target.checked, showTotal)
                          setPdfBlob(blob)
                        } catch (err) {
                          console.error('Failed to regenerate PDF:', err)
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">12% VAT</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTotal}
                      onChange={async (e) => {
                        setShowTotal(e.target.checked)
                        try {
                          const blob = await tableRef.current?.generatePdfPreview(showSubtotal, showVat, e.target.checked)
                          setPdfBlob(blob)
                        } catch (err) {
                          console.error('Failed to regenerate PDF:', err)
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Total Sales</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setPdfPreviewOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = URL.createObjectURL(pdfBlob)
                      link.download = `statement-${statementId || 'export'}.pdf`
                      link.click()
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={() => {
                      const printWindow = window.open(URL.createObjectURL(pdfBlob))
                      if (printWindow) {
                        printWindow.onload = () => {
                          printWindow.print()
                        }
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
