'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('statement_activity', {
      sa_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      sa_statement_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'statement_of_account',
          key: 'soa_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sa_action: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      },
      sa_by: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      sa_date: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('statement_activity')
  },
}
