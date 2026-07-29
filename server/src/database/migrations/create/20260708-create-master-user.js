'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_user', {
      mu_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      mu_employee_id: {
        type: Sequelize.STRING(9),
        allowNull: false,
      },
      mu_fullname: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      mu_username: {
        type: Sequelize.STRING(60),
        allowNull: false,
        unique: true,
      },
      mu_password: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      mu_access_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_access',
          key: 'ma_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      mu_status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('master_user')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_master_user_mu_status"')
  },
}
