'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('statement_of_account', 'soa_statement_type', {
      type: Sequelize.ENUM('SERVICE', 'MAINTENANCE'),
      allowNull: false,
      defaultValue: 'SERVICE',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('statement_of_account', 'soa_statement_type')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_statement_of_account_soa_statement_type"')
  },
}
