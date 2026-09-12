'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'master_department',
      [
        {
          md_code: 'CAB',
          md_description: 'Cabling',
          md_status: 'ACTIVE',
        },
        {
          md_code: 'IT',
          md_description: 'IT',
          md_status: 'ACTIVE',
        },
        {
          md_code: 'SHELL',
          md_description: 'Shell',
          md_status: 'ACTIVE',
        },
      ],
      {
        ignoreDuplicates: true,
      },
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('master_department', {
      md_code: ['CAB', 'IT', 'SHELL'],
    })
  },
}
