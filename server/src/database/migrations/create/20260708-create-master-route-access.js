'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_route_access', {
      mra_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      mra_access_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_access',
          key: 'ma_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      mra_name: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      mra_status: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('master_route_access')
  },
}
