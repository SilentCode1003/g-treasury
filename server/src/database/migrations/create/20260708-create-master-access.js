'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_access', {
      ma_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      ma_name: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      ma_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('master_access')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_master_access_ma_status"')
  },
}
