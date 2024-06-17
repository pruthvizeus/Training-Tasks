const { faker } = require('@faker-js/faker');
const ExcelJS = require('exceljs');

// Number of records to generate
const totalRecords = 100000;

// Create a new workbook and worksheet
const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Students');

// Add column headers
worksheet.columns = [
  { header: 'ID', key: 'id', width: 10 },
  { header: 'Name', key: 'name', width: 30 },
  { header: 'Email', key: 'email', width: 30 },
  { header: 'Contact', key: 'contact', width: 20 },
];

// Generate data
for (let i = 1; i <= totalRecords; i++) {
  worksheet.addRow({
    id: i,
    name: faker.person.fullName(),
    email: faker.internet.email(),
    contact: faker.phone.number(),
  });

  // Log progress for every 10000 records
  if (i % 10000 === 0) {
    console.log(`Generated ${i} records`);
  }
}

// Write to Excel file
workbook.xlsx.writeFile('students_data.xlsx')
  .then(() => {
    console.log('Excel file created successfully.');
  })
  .catch((err) => {
    console.error('Error creating Excel file:', err);
  });
