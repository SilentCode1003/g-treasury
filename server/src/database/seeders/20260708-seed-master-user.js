'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    const [adminAccess] = await queryInterface.sequelize.query(
      "SELECT ma_id FROM master_access WHERE ma_name = 'ADMIN' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    )

    await queryInterface.bulkInsert(
      'master_user',
      [
        {
          mu_employee_id: 'ADMIN001',
          mu_fullname: 'Administrator',
          mu_username: 'admin',
          mu_password: '987cebacbab7ff9c4ac35488f70047e0',
          mu_access_id: adminAccess ? adminAccess.ma_id : null,
          mu_status: 'ACTIVE',
        },
      ],
      {
        ignoreDuplicates: true,
      },
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('master_user', {
      mu_username: 'admin',
    })
  },
}
