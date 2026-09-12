'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    // First, get the ADMIN access ID
    const [accessRecords] = await queryInterface.sequelize.query(
      `SELECT ma_id FROM master_access WHERE ma_name = 'ADMIN' LIMIT 1`
    )

    if (!accessRecords || accessRecords.length === 0) {
      console.log('No ADMIN access found, skipping route access seeding')
      return
    }

    const adminAccessId = accessRecords[0].ma_id

    // All routes from the sidebar
    const routes = [
      'dashboard',
      'company',
      'department',
      'service',
      'store',
      'parts',
      'user',
      'access',
      'statement',
    ]

    // Insert route access records for ADMIN
    const routeAccessData = routes.map((route) => ({
      mra_access_id: adminAccessId,
      mra_name: route,
      mra_status: 'Full Access',
    }))

    await queryInterface.bulkInsert('master_route_access', routeAccessData, {
      ignoreDuplicates: true,
    })
  },

  async down(queryInterface, Sequelize) {
    // Delete all route access records
    await queryInterface.bulkDelete('master_route_access', {}, {})
  },
}
