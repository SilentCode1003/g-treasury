'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('master_company', {
      mc_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      mc_name: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      mc_address: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      },
      mc_email: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      mc_mobile_number: {
        type: Sequelize.STRING(15),
        allowNull: true,
      },
      mc_telephone_number: {
        type: Sequelize.STRING(15),
        allowNull: true,
      },
      mc_tin: {
        type: Sequelize.STRING(15),
        allowNull: true,
      },
      mc_details: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
      },
      mc_type: {
        type: Sequelize.ENUM('VENDOR', 'CUSTOMER', 'INTERNAL'),
        allowNull: false,
        defaultValue: 'CUSTOMER',
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('master_company')
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_master_company_mc_type"')
  },
}
