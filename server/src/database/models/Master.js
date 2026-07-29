/**
 * ⚠️ AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 */

/**
 * @typedef {Object} AccessCols
 * @property {'ma_id'} id
 * @property {'ma_name'} name
 * @property {'ma_status'} status
 */

/**
 * @typedef {Object} CompanyCols
 * @property {'mc_id'} id
 * @property {'mc_name'} name
 * @property {'mc_address'} address
 * @property {'mc_email'} email
 * @property {'mc_mobile_number'} mobile_number
 * @property {'mc_telephone_number'} telephone_number
 * @property {'mc_tin'} tin
 * @property {'mc_details'} details
 * @property {'mc_type'} type
 */

/**
 * @typedef {Object} DepartmentCols
 * @property {'md_id'} id
 * @property {'md_code'} code
 * @property {'md_description'} description
 * @property {'md_status'} status
 */

/**
 * @typedef {Object} RouteAccessCols
 * @property {'mra_id'} id
 * @property {'mra_access_id'} access_id
 * @property {'mra_name'} name
 * @property {'mra_status'} status
 */

/**
 * @typedef {Object} ServiceCols
 * @property {'ms_id'} id
 * @property {'ms_department_id'} department_id
 * @property {'ms_name'} name
 * @property {'ms_price'} price
 * @property {'ms_status'} status
 */

/**
 * @typedef {Object} StoreCols
 * @property {'ms_id'} id
 * @property {'ms_number'} number
 * @property {'ms_name'} name
 * @property {'ms_region'} region
 * @property {'ms_city_province'} city_province
 * @property {'ms_status'} status
 */

/**
 * @typedef {Object} UserCols
 * @property {'mu_id'} id
 * @property {'mu_employee_id'} employee_id
 * @property {'mu_fullname'} fullname
 * @property {'mu_username'} username
 * @property {'mu_password'} password
 * @property {'mu_access_id'} access_id
 * @property {'mu_status'} status
 */

const Master = {
  Access: {
    table: 'master_access',
    pk: 'ma_id',
    prefix: 'ma',
    /** @type {AccessCols} */
    cols: {
      id: 'ma_id',
      name: 'ma_name',
      status: 'ma_status',
    },
    select: ['ma_id', 'ma_name', 'ma_status'],
    insert: ['ma_name', 'ma_status'],
  },
  Company: {
    table: 'master_company',
    pk: 'mc_id',
    prefix: 'mc',
    /** @type {CompanyCols} */
    cols: {
      id: 'mc_id',
      name: 'mc_name',
      address: 'mc_address',
      email: 'mc_email',
      mobile_number: 'mc_mobile_number',
      telephone_number: 'mc_telephone_number',
      tin: 'mc_tin',
      details: 'mc_details',
      type: 'mc_type',
    },
    select: ['mc_id', 'mc_name', 'mc_address', 'mc_email', 'mc_mobile_number', 'mc_telephone_number', 'mc_tin', 'mc_details', 'mc_type'],
    insert: ['mc_name', 'mc_address', 'mc_email', 'mc_mobile_number', 'mc_telephone_number', 'mc_tin', 'mc_details', 'mc_type'],
  },
  Department: {
    table: 'master_department',
    pk: 'md_id',
    prefix: 'md',
    /** @type {DepartmentCols} */
    cols: {
      id: 'md_id',
      code: 'md_code',
      description: 'md_description',
      status: 'md_status',
    },
    select: ['md_id', 'md_code', 'md_description', 'md_status'],
    insert: ['md_code', 'md_description', 'md_status'],
  },
  RouteAccess: {
    table: 'master_route_access',
    pk: 'mra_id',
    prefix: 'mra',
    /** @type {RouteAccessCols} */
    cols: {
      id: 'mra_id',
      access_id: 'mra_access_id',
      name: 'mra_name',
      status: 'mra_status',
    },
    select: ['mra_id', 'mra_access_id', 'mra_name', 'mra_status'],
    insert: ['mra_access_id', 'mra_name', 'mra_status'],
  },
  Service: {
    table: 'master_service',
    pk: 'ms_id',
    prefix: 'ms',
    /** @type {ServiceCols} */
    cols: {
      id: 'ms_id',
      department_id: 'ms_department_id',
      name: 'ms_name',
      price: 'ms_price',
      status: 'ms_status',
    },
    select: ['ms_id', 'ms_department_id', 'ms_name', 'ms_price', 'ms_status'],
    insert: ['ms_department_id', 'ms_name', 'ms_price', 'ms_status'],
  },
  Store: {
    table: 'master_store',
    pk: 'ms_id',
    prefix: 'ms',
    /** @type {StoreCols} */
    cols: {
      id: 'ms_id',
      number: 'ms_number',
      name: 'ms_name',
      region: 'ms_region',
      city_province: 'ms_city_province',
      status: 'ms_status',
    },
    select: ['ms_id', 'ms_number', 'ms_name', 'ms_region', 'ms_city_province', 'ms_status'],
    insert: ['ms_number', 'ms_name', 'ms_region', 'ms_city_province', 'ms_status'],
  },
  User: {
    table: 'master_user',
    pk: 'mu_id',
    prefix: 'mu',
    /** @type {UserCols} */
    cols: {
      id: 'mu_id',
      employee_id: 'mu_employee_id',
      fullname: 'mu_fullname',
      username: 'mu_username',
      password: 'mu_password',
      access_id: 'mu_access_id',
      status: 'mu_status',
    },
    select: ['mu_id', 'mu_employee_id', 'mu_fullname', 'mu_username', 'mu_password', 'mu_access_id', 'mu_status'],
    insert: ['mu_employee_id', 'mu_fullname', 'mu_username', 'mu_password', 'mu_access_id', 'mu_status'],
  },
};

exports.Master = Master;