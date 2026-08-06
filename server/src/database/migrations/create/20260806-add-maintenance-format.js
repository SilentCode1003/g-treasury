'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('statement_of_account', 'soa_maintenance_format', {
      type: Sequelize.ENUM('REGIONAL_SUMMARY', 'ITEMIZED_PARTS', 'OFFICIAL_INVOICE'),
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('statement_of_account', 'soa_maintenance_format')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_statement_of_account_soa_maintenance_format"')
  },
}
