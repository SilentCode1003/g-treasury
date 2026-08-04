'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    // await queryInterface.bulkInsert(
    //   'master_access',
    //   [
    //     {
    //       ma_name: 'ADMIN',
    //       ma_status: 'ACTIVE',
    //     },
    //   ],
    //   {
    //     ignoreDuplicates: true,
    //   },
    // )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('master_access', {
      ma_name: 'ADMIN',
    })
  },
}
