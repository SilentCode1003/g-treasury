'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_department', {
      md_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      md_code: {
        type: Sequelize.STRING(6),
        allowNull: false,
      },
      md_description: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      md_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('master_department')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_master_department_md_status"')
  },
}
