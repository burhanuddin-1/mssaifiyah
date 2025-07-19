const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

// Import student data
const studentData = require('./student-data.js');

async function importStudents() {
  try {
    // Ensure database directory exists
    const dbDir = path.join(__dirname, 'database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Open the database connection
    const db = await open({
      filename: path.join(dbDir, 'madrasa.db'),
      driver: sqlite3.Database
    });

    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        classId TEXT NOT NULL,
        mobileNo TEXT,
        sanad TEXT,
        dob TEXT,
        hdob TEXT,
        teacher TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        markedBy TEXT NOT NULL,
        FOREIGN KEY (studentId) REFERENCES students(id)
      );

      CREATE TABLE IF NOT EXISTS leave_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentId TEXT NOT NULL,
        fromDate TEXT NOT NULL,
        toDate TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        reviewedBy TEXT,
        reviewedAt DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (studentId) REFERENCES students(id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables created successfully');

    console.log('Starting student import...');
    
    // Begin a transaction for better performance
    await db.exec('BEGIN TRANSACTION');
    
    // Insert students
    for (const [id, student] of Object.entries(studentData)) {
      await db.run(
        `INSERT INTO students (id, fullName, classId, mobileNo, sanad, dob, hdob, teacher)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           fullName = excluded.fullName,
           classId = excluded.classId,
           mobileNo = excluded.mobileNo,
           sanad = excluded.sanad,
           dob = excluded.dob,
           hdob = excluded.hdob,
           teacher = excluded.teacher`,
        [
          id,
          student.fullName,
          student.classId,
          student.mobileNo || '',
          student.sanad || '',
          student.dob || '',
          student.hdob || '',
          student.teacher || ''
        ]
      );
      console.log(`Imported student: ${student.fullName}`);
    }
    
    // Commit the transaction
    await db.exec('COMMIT');
    console.log('Student import completed successfully!');
    
    // Close the database connection
    await db.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error during student import:', error);
    if (db) {
      await db.close();
      console.log('Database connection closed in error block');
    }
    process.exit(1);
  }
}

// Check if student-data.js exists, if not create it from student.js
const studentJsPath = path.join(__dirname, 'student.js');
const studentDataPath = path.join(__dirname, 'student-data.js');

if (!fs.existsSync(studentDataPath) && fs.existsSync(studentJsPath)) {
  // Read the original student.js file
  let studentJsContent = fs.readFileSync(studentJsPath, 'utf8');
  
  // Add module.exports to make it a proper module
  if (!studentJsContent.includes('module.exports')) {
    studentJsContent += '\nmodule.exports = fullStudentInfo;';
    fs.writeFileSync(studentDataPath, studentJsContent);
    console.log('Created student-data.js with proper exports');
  }
}

// Run the import
importStudents().catch(console.error);
