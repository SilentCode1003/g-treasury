const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildStatementTitle,
  buildStatementCreatePayload,
  calculateStatementSaveTotal,
  buildStatementHeaders,
} = require('../src/utilities/statement.util')

test('buildStatementTitle uses selected service names and the fixed suffix', () => {
  const title = buildStatementTitle([{ name: 'Aircon Installation' }, { name: 'Plumbing Repair' }])

  assert.equal(
    title,
    'STATEMENT OF ACCOUNT FOR AIRCON INSTALLATION, PLUMBING REPAIR INSTALLATION, RENOVATION',
  )
})

test('buildStatementCreatePayload uses the session user as prepared_by when not provided', () => {
  const payload = buildStatementCreatePayload(
    {
      company_from: 1,
      company_to: 2,
      date: 'July 2026',
      services: [{ name: 'Aircon Installation' }],
    },
    {
      session: {
        user: {
          fullname: 'Jane Doe',
        },
      },
    },
  )

  assert.equal(
    payload.title,
    'STATEMENT OF ACCOUNT FOR AIRCON INSTALLATION INSTALLATION, RENOVATION',
  )
  assert.equal(payload.prepared_by, 'Jane Doe')
  assert.equal(payload.company_from, 1)
  assert.equal(payload.company_to, 2)
})

test('calculateStatementSaveTotal sums rows using the same sales and additional sales fields', () => {
  const rows = [
    {
      values: {
        sales: 100,
        additional_sales: 25,
        total_sales: 125,
      },
    },
    {
      values: {
        sales: 50,
        additional_sales: 10,
        total_sales: 60,
      },
    },
  ]

  assert.equal(calculateStatementSaveTotal(rows, ['sales', 'additional_sales', 'total_sales']), 185)
})

test('calculateStatementSaveTotal resolves display headers into the corresponding row keys', () => {
  const rows = [
    {
      values: {
        sales: 120,
        additional_sales_mobilization: 30,
      },
    },
  ]

  assert.equal(calculateStatementSaveTotal(rows, ['Sales', 'Additional Sales (Mobilization)']), 150)
})

test('buildStatementHeaders preserves quantity headers and appends the VAT column header when enabled', () => {
  const headers = buildStatementHeaders(
    ['Service A', 'QTY (Service A)', 'Service B', 'QTY (Service B)'],
    { vatMode: true, quantityMode: true },
  )

  assert.deepEqual(headers, [
    'Service A',
    'QTY (Service A)',
    'Service B',
    'QTY (Service B)',
    '%VAT',
  ])
})

test('calculateStatementSaveTotal multiplies service totals by matching quantity fields', () => {
  const rows = [
    {
      values: {
        service_a: 100,
        service_a_qty: 2,
      },
    },
    {
      values: {
        service_a: 50,
        service_a_qty: 3,
      },
    },
  ]

  const totals = calculateStatementSaveTotal(rows, ['service_a', 'service_a_qty'], {
    quantityMode: true,
  })

  assert.equal(totals.subTotal, 350)
  assert.equal(totals.vat, 70)
  assert.equal(totals.total, 420)
})

test('calculateStatementSaveTotal adds service quantities and additional sales mobilization', () => {
  const rows = [
    {
      values: {
        sales: 0,
        service_a: 100,
        service_a_qty: 2,
        additional_sales_mobilization: 30,
      },
    },
    {
      values: {
        sales: 0,
        service_b: 50,
        service_b_qty: 3,
        additional_sales_mobilization: 20,
      },
    },
  ]

  const totals = calculateStatementSaveTotal(
    rows,
    [
      'sales',
      'service_a',
      'service_a_qty',
      'service_b',
      'service_b_qty',
      'additional_sales_mobilization',
    ],
    {
      quantityMode: true,
    },
  )

  assert.equal(totals.subTotal, 400)
  assert.equal(totals.vat, 80)
  assert.equal(totals.total, 480)
})

test('calculateStatementSaveTotal uses row-level VAT when VAT-per-row is enabled', () => {
  const rows = [
    {
      values: {
        sales: 100,
        additional_sales: 25,
        total_sales: 125,
      },
    },
    {
      values: {
        sales: 50,
        additional_sales: 10,
        total_sales: 60,
      },
    },
  ]

  const totals = calculateStatementSaveTotal(rows, ['sales', 'additional_sales', 'total_sales'], {
    vatMode: true,
  })

  assert.equal(totals.subTotal, 185)
  assert.equal(totals.vat, 37)
  assert.equal(totals.total, 222)
})

test('calculateStatementSaveTotal multiplies only services with matching quantity metadata', () => {
  const rows = [
    {
      values: {
        service_a: 100,
        service_a_qty: 2,
        service_b: 50,
      },
    },
  ]

  const totals = calculateStatementSaveTotal(rows, ['service_a', 'service_a_qty', 'service_b'], {
    quantityMeta: [
      {
        key: 'service_a_qty',
        quantityMeta: {
          relatedServiceKey: 'service_a',
        },
      },
    ],
  })

  assert.equal(totals.subTotal, 250)
  assert.equal(totals.vat, 50)
  assert.equal(totals.total, 300)
})

test('buildStatementHeaders keeps explicit quantity headers even when the global toggle is off', () => {
  const headers = buildStatementHeaders(['Service A', 'QTY (Service A)', 'Service B'], {
    vatMode: false,
    quantityMode: false,
  })

  assert.deepEqual(headers, ['Service A', 'QTY (Service A)', 'Service B'])
})
