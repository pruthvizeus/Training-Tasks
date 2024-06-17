const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import cors

const app = express();
const port = 4000;

// Enable CORS
app.use(cors());

// Set up middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// MySQL connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'pruthvi',

});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL');
});

// API to handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  // Read the Excel file
  const workbook = xlsx.read(file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Parse Excel sheet to JSON
  const students = xlsx.utils.sheet_to_json(sheet);

  // Insert each student into the database, handling duplicates
  const responses = [];

  function insertStudent(student, callback) {
    const { name, email, contact } = student;

    const query = `
      INSERT INTO students (name, email, contact)
      VALUES (?, ?, ?)
    `;
    connection.query(query, [name, email, contact], (err, results) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          console.log('Duplicate entry found');
          responses.push({ error: `Duplicate entry for email ${email}.` });
        } else {
          console.log('Error inserting students ');
          responses.push({ error: `Error inserting student with email ${email}: ${err.message}` });
        }
      } else {
        console.log('Inserted student with email: ', email);
      
      }
      callback();
    });
  }

  let completed = 0;
  function checkCompleted() {
    completed++;
    if (completed === students.length) {
      res.send(responses);
    }
  }

  students.forEach(student => {
    insertStudent(student, checkCompleted);
  });
});

// API to fetch data from the students table with pagination
app.get('/fetch', (req, res) => {
  const page = parseInt(req.query.page, 100) || 1; // Default to page 1 if not specified
  const pageSize = parseInt(req.query.pageSize, 100) || 100; // Default to 100 items per page if not specified

  const offset = (page - 1) * pageSize;

  // Query to fetch data with pagination
  const fetchQuery = `SELECT * FROM students LIMIT ? OFFSET ?`;
  const countQuery = `SELECT COUNT(*) AS total FROM students`;

  connection.query(countQuery, (err, countResults) => {
    if (err) {
      console.error('Error counting rows: ', err);
      return res.status(500).send('Error counting rows.');
    }

    const totalRows = countResults[0].total;
    const totalPages = Math.ceil(totalRows / pageSize);

    connection.query(fetchQuery, [pageSize, offset], (err, results) => {
      if (err) {
        console.error('Error fetching data: ', err);
        return res.status(500).send('Error fetching data.');
      }

      res.send({
        data: results,
        meta: {
          totalRows,
          totalPages,
          currentPage: page,
          pageSize,
        },
      });
    });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

// Gracefully close the connection when the process ends
process.on('SIGINT', () => {
  connection.end();
  process.exit();
});
