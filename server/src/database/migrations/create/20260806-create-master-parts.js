'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_parts', {
      mp_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      mp_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      mp_description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      mp_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      mp_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('master_parts')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_master_parts_mp_status"')
  },
}
