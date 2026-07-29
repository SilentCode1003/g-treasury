'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('statement_of_account', {
      soa_id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      soa_company_from: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_company',
          key: 'mc_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      soa_company_to: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'master_company',
          key: 'mc_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      soa_date: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      soa_title: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      soa_headers: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      soa_sub_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      soa_vat: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      soa_total: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      soa_prepared_by: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('statement_of_account')
  },
}
