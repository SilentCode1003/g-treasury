/**
 * ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 */

/**
 * @typedef {Object} OfAccountCols
 * @property {'soa_id'} id
 * @property {'soa_company_from'} company_from
 * @property {'soa_company_to'} company_to
 * @property {'soa_date'} date
 * @property {'soa_title'} title
 * @property {'soa_headers'} headers
 * @property {'soa_sub_total'} sub_total
 * @property {'soa_vat'} vat
 * @property {'soa_total'} total
 * @property {'soa_prepared_by'} prepared_by
 */

/**
 * @typedef {Object} ActivityCols
 * @property {'sa_id'} id
 * @property {'sa_statement_id'} statement_id
 * @property {'sa_action'} action
 * @property {'sa_by'} by
 * @property {'sa_date'} date
 */

/**
 * @typedef {Object} ItemsCols
 * @property {'si_id'} id
 * @property {'si_statement_id'} statement_id
 * @property {'si_items'} items
 */

const Statement = {
  OfAccount: {
    table: 'statement_of_account',
    pk: 'soa_id',
    prefix: 'soa',
    /** @type {OfAccountCols} */
    cols: {
      id: 'soa_id',
      company_from: 'soa_company_from',
      company_to: 'soa_company_to',
      date: 'soa_date',
      title: 'soa_title',
      headers: 'soa_headers',
      sub_total: 'soa_sub_total',
      vat: 'soa_vat',
      total: 'soa_total',
      prepared_by: 'soa_prepared_by',
    },
    select: ['soa_id', 'soa_company_from', 'soa_company_to', 'soa_date', 'soa_title', 'soa_headers', 'soa_sub_total', 'soa_vat', 'soa_total', 'soa_prepared_by'],
    insert: ['soa_company_from', 'soa_company_to', 'soa_date', 'soa_title', 'soa_headers', 'soa_sub_total', 'soa_vat', 'soa_total', 'soa_prepared_by'],
  },
  Activity: {
    table: 'statement_activity',
    pk: 'sa_id',
    prefix: 'sa',
    /** @type {ActivityCols} */
    cols: {
      id: 'sa_id',
      statement_id: 'sa_statement_id',
      action: 'sa_action',
      by: 'sa_by',
      date: 'sa_date',
    },
    select: ['sa_id', 'sa_statement_id', 'sa_action', 'sa_by', 'sa_date'],
    insert: ['sa_statement_id', 'sa_action', 'sa_by', 'sa_date'],
  },
  Items: {
    table: 'statement_items',
    pk: 'si_id',
    prefix: 'si',
    /** @type {ItemsCols} */
    cols: {
      id: 'si_id',
      statement_id: 'si_statement_id',
      items: 'si_items',
    },
    select: ['si_id', 'si_statement_id', 'si_items'],
    insert: ['si_statement_id', 'si_items'],
  },
};

exports.Statement = Statement;