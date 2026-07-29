'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_store', {
      ms_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      ms_number: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      ms_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      ms_region: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      ms_city_province: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      ms_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('master_store')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_master_store_ms_status"')
  },
}
