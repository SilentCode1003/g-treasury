'use strict'

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('master_parts', [
      // For Repair
      { mp_name: 'Balun Connector', mp_unit: 'piece', mp_price: 130.0, mp_status: 'ACTIVE' },
      { mp_name: 'BNC Connector', mp_unit: 'piece', mp_price: 14.3, mp_status: 'ACTIVE' },
      { mp_name: 'DC Crown Plug', mp_unit: 'piece', mp_price: 10.4, mp_status: 'ACTIVE' },
      { mp_name: 'RJ 45', mp_unit: 'piece', mp_price: 6.0, mp_status: 'ACTIVE' },
      { mp_name: 'Rubber Boots', mp_unit: 'piece', mp_price: 5.82, mp_status: 'ACTIVE' },
      { mp_name: 'Cat 5e UTP Cable', mp_unit: 'meter', mp_price: 29.92, mp_status: 'ACTIVE' },

      // Indirect Materials / Parts Description (For Analog)
      { mp_name: 'Siamese Cable', mp_unit: 'Per Meter', mp_price: 16.2, mp_status: 'ACTIVE' },
      { mp_name: 'Balun Connector', mp_unit: 'Pc', mp_price: 130.0, mp_status: 'ACTIVE' },
      { mp_name: 'BNC Connector', mp_unit: 'Pc', mp_price: 14.3, mp_status: 'ACTIVE' },
      { mp_name: 'DC Crown Plug', mp_unit: 'Pc', mp_price: 10.4, mp_status: 'ACTIVE' },
      { mp_name: 'White IP65 Box', mp_unit: 'Pc', mp_price: 130.0, mp_status: 'ACTIVE' },
      { mp_name: 'Junction Box', mp_unit: 'Pc', mp_price: 65.0, mp_status: 'ACTIVE' },
      { mp_name: 'Amco Box', mp_unit: 'Pc', mp_price: 91.0, mp_status: 'ACTIVE' },
      { mp_name: 'Pole extender/bracket', mp_unit: 'Pc', mp_price: 450.0, mp_status: 'ACTIVE' },
      { mp_name: 'Black Screw', mp_unit: 'Pc', mp_price: 0.75, mp_status: 'ACTIVE' },
      { mp_name: 'Plastic Moulding 1"', mp_unit: 'Pc', mp_price: 117.0, mp_status: 'ACTIVE' },
      { mp_name: 'PVC Pipe', mp_unit: 'Pc', mp_price: 97.5, mp_status: 'ACTIVE' },
      {
        mp_name: 'PVC Pipe (Fittings/Connectors)',
        mp_unit: 'Pc',
        mp_price: 15.6,
        mp_status: 'ACTIVE',
      },
      {
        mp_name: 'Flexi Hose - Orange (Plastic)',
        mp_unit: 'Per Meter',
        mp_price: 13.26,
        mp_status: 'ACTIVE',
      },
      {
        mp_name: 'Flexi Hose - Orange (Metal)',
        mp_unit: 'Per Meter',
        mp_price: 17.68,
        mp_status: 'ACTIVE',
      },
      { mp_name: 'EMT Pipe', mp_unit: 'Pc', mp_price: 275.0, mp_status: 'ACTIVE' },
      {
        mp_name: 'EMT Pipe (Fittings/Connectors)',
        mp_unit: 'Pc',
        mp_price: 32.5,
        mp_status: 'ACTIVE',
      },
      { mp_name: 'HDD 6TB', mp_unit: 'Pc', mp_price: 10790.0, mp_status: 'ACTIVE' },
      { mp_name: 'LCD/LED Monitor', mp_unit: 'Pc', mp_price: 2475.2, mp_status: 'ACTIVE' },
      { mp_name: 'Mouse', mp_unit: 'Pc', mp_price: 247.0, mp_status: 'ACTIVE' },
      { mp_name: 'UPS - 650VA', mp_unit: 'Pc', mp_price: 1892.8, mp_status: 'ACTIVE' },
      { mp_name: 'Single Power Adapter', mp_unit: 'Pc', mp_price: 218.4, mp_status: 'ACTIVE' },
      { mp_name: 'Centralized Power Supply', mp_unit: 'Pc', mp_price: 1553.5, mp_status: 'ACTIVE' },
      { mp_name: 'RCA for Audio', mp_unit: 'Pc', mp_price: 150.0, mp_status: 'ACTIVE' },
      { mp_name: 'HDMI Cable', mp_unit: 'Per Meter', mp_price: 427.7, mp_status: 'ACTIVE' },

      // Materials / Parts Description (For IP Camera)
      { mp_name: 'Cat5e UTP Cable', mp_unit: 'Per Meter', mp_price: 29.92, mp_status: 'ACTIVE' },
      { mp_name: 'RJ45', mp_unit: 'Pc', mp_price: 6.99, mp_status: 'ACTIVE' },
      { mp_name: 'Rubber boots', mp_unit: 'Pc', mp_price: 5.82, mp_status: 'ACTIVE' },

      // Handwritten Additions
      { mp_name: 'Faceplate', mp_unit: '1 Pc', mp_price: 150.0, mp_status: 'ACTIVE' },
      { mp_name: 'IO (Information Outlet)', mp_unit: '1 Pc', mp_price: 250.0, mp_status: 'ACTIVE' },
    ])
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('master_parts', {
      mp_name: [
        'Balun Connector',
        'BNC Connector',
        'DC Crown Plug',
        'RJ 45',
        'Rubber Boots',
        'Cat 5e UTP Cable',
        'Siamese Cable',
        'White IP65 Box',
        'Junction Box',
        'Amco Box',
        'Pole extender/bracket',
        'Black Screw',
        'Plastic Moulding 1"',
        'PVC Pipe',
        'PVC Pipe (Fittings/Connectors)',
        'Flexi Hose - Orange (Plastic)',
        'Flexi Hose - Orange (Metal)',
        'EMT Pipe',
        'EMT Pipe (Fittings/Connectors)',
        'HDD 6TB',
        'LCD/LED Monitor',
        'Mouse',
        'UPS - 650VA',
        'Single Power Adapter',
        'Centralized Power Supply',
        'RCA for Audio',
        'HDMI Cable',
        'Cat5e UTP Cable',
        'RJ45',
        'Rubber boots',
        'Faceplate',
        'IO (Information Outlet)',
      ],
    })
  },
}
