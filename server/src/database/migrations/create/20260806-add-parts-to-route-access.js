'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    // Get all existing access records
    const [accessRecords] = await queryInterface.sequelize.query(
      `SELECT ma_id, ma_name FROM master_access`
    )

    if (!accessRecords || accessRecords.length === 0) {
      console.log('No access records found, skipping parts route access migration')
      return
    }

    // Insert parts route access for each existing access record
    const routeAccessData = accessRecords.map((access) => ({
      mra_access_id: access.ma_id,
      mra_name: 'parts',
      mra_status: 'Full Access',
    }))

    await queryInterface.bulkInsert('master_route_access', routeAccessData, {
      ignoreDuplicates: true,
    })

    console.log(`Added parts route access for ${accessRecords.length} access records`)
  },

  async down(queryInterface, Sequelize) {
    // Delete parts route access records
    await queryInterface.bulkDelete('master_route_access', {
      mra_name: 'parts',
    }, {})
  },
}
