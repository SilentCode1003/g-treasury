'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('statement_items', {
      si_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      si_statement_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'statement_of_account',
          key: 'soa_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      si_items: {
        type: Sequelize.JSON,
        allowNull: false,
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('statement_items')
  },
}
