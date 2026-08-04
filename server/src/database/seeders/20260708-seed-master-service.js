'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    // const departments = await queryInterface.sequelize.query(
    //   "SELECT md_id, md_code FROM master_department WHERE md_code IN ('CAB', 'IT')",
    //   { type: queryInterface.sequelize.QueryTypes.SELECT },
    // )

    // const cabling = departments.find((d) => d.md_code === 'CAB')
    // const it = departments.find((d) => d.md_code === 'IT')

    // const rows = []

    // if (cabling) {
    //   rows.push(
    //     {
    //       ms_department_id: cabling.md_id,
    //       ms_name: 'NEW STORE',
    //       ms_price: 33370.0,
    //       ms_status: 'ACTIVE',
    //     },
    //     {
    //       ms_department_id: cabling.md_id,
    //       ms_name: 'RENOVATION',
    //       ms_price: 33370.0,
    //       ms_status: 'ACTIVE',
    //     },
    //     {
    //       ms_department_id: cabling.md_id,
    //       ms_name: 'ATHENNA INSTALLATION',
    //       ms_price: 0.0,
    //       ms_status: 'ACTIVE',
    //     },
    //     {
    //       ms_department_id: cabling.md_id,
    //       ms_name: 'RECTIFICATION',
    //       ms_price: 16685.0,
    //       ms_status: 'ACTIVE',
    //     },
    //     {
    //       ms_department_id: cabling.md_id,
    //       ms_name: 'CABLE INTERNET',
    //       ms_price: 7000.0,
    //       ms_status: 'ACTIVE',
    //     },
    //     {
    //       ms_department_id: cabling.md_id,
    //       ms_name: 'KIOSK',
    //       ms_price: 7000.0,
    //       ms_status: 'ACTIVE',
    //     },
    //     {
    //       ms_department_id: cabling.md_id,
    //       ms_name: 'CABLE PULLING',
    //       ms_price: 1000.0,
    //       ms_status: 'ACTIVE',
    //     },
    //   )
    // }

    // if (it) {
    //   rows.push(
    //     {
    //       ms_department_id: it.md_id,
    //       ms_name: 'PUNCHLISTING',
    //       ms_price: 8000.0,
    //       ms_status: 'ACTIVE',
    //     },
    //     {
    //       ms_department_id: it.md_id,
    //       ms_name: 'REPUNCHLISTING',
    //       ms_price: 8000.0,
    //       ms_status: 'ACTIVE',
    //     },
    //     {
    //       ms_department_id: it.md_id,
    //       ms_name: 'POS CONVERSATION',
    //       ms_price: 5779.0,
    //       ms_status: 'ACTIVE',
    //     },
    //     {
    //       ms_department_id: it.md_id,
    //       ms_name: 'CARTRIDGE TONE',
    //       ms_price: 2050.0,
    //       ms_status: 'ACTIVE',
    //     },
    //     {
    //       ms_department_id: it.md_id,
    //       ms_name: 'CMOS BATTERY',
    //       ms_price: 100.0,
    //       ms_status: 'ACTIVE',
    //     },
    //   )
    // }

    // if (rows.length > 0) {
    //   await queryInterface.bulkInsert('master_service', rows, {
    //     ignoreDuplicates: true,
    //   })
    // }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('master_service', {
      ms_name: [
        'NEW STORE',
        'RENOVATION',
        'ATHENNA INSTALLATION',
        'RECTIFICATION',
        'CABLE INTERNET',
        'KIOSK',
        'CABLE PULLING',
        'PUNCHLISTING', 
        'REPUNCHLISTING',
        'POS CONVERSATION',
        'CARTRIDGE TONE',
        'CMOS BATTERY',
      ],
    })
  },
}
