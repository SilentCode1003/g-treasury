'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_service', {
      ms_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      ms_department_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_department',
          key: 'md_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      ms_name: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      ms_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      ms_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('master_service')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_master_service_ms_status"')
  },
}
