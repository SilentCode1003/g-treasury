'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('master_parts', 'mp_unit', {
      type: Sequelize.STRING(300),
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('master_parts', 'mp_unit')
  },
}
