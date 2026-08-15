'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('statement_of_account', 'soa_service_quantity_selection')
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('statement_of_account', 'soa_service_quantity_selection', {
      type: Sequelize.JSON,
      allowNull: true,
    })
  },
}
