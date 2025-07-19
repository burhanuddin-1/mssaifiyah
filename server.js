require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Database connection
let db;
async function initializeDatabase() {
  try {
    // Ensure database directory exists
    const dbDir = path.join(__dirname, 'database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database connection
    db = await open({
      filename: path.join(dbDir, 'madrasa.db'),
      driver: sqlite3.Database
    });

    // Verify connection
    await db.get('SELECT 1');
    console.log('Database connection verified');

    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        classId TEXT NOT NULL,
        mobileNo TEXT,
        sanad TEXT,
        dob TEXT,
        hdob TEXT,
        teacher TEXT,
        password TEXT NOT NULL,
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
    `);

    console.log('Database tables created/verified successfully');

    // Test database by fetching all students
    try {
      const students = await db.all('SELECT * FROM students');
      console.log(`Found ${students.length} students in database`);
      if (students.length > 0) {
        console.log('First student:', students[0].id, students[0].fullName);
      }
    } catch (error) {
      console.error('Error testing database:', error);
    }

  } catch (error) {
    console.error('Database error:', error);
    process.exit(1);
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname,'index.html'));
});

// Test endpoint (no auth required)
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// API endpoints
app.get('/api/students', async (req, res) => {
  try {
    console.log('Fetching all students...');
    const students = await db.all('SELECT * FROM students');
    console.log(`Found ${students.length} students`);
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await db.get('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/students', async (req, res) => {
  try {
    const { id, fullName, classId, mobileNo, sanad, dob, hdob, teacher } = req.body;
    await db.run(
      'INSERT INTO students (id, fullName, classId, mobileNo, sanad, dob, hdob, teacher) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, fullName, classId, mobileNo, sanad, dob, hdob, teacher]
    );
    res.status(201).json({ message: 'Student added successfully' });
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const { fullName, classId, mobileNo, sanad, dob, hdob, teacher } = req.body;
    await db.run(
      'UPDATE students SET fullName = ?, classId = ?, mobileNo = ?, sanad = ?, dob = ?, hdob = ?, teacher = ? WHERE id = ?',
      [fullName, classId, mobileNo, sanad, dob, hdob, teacher, req.params.id]
    );
    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM students WHERE id = ?', [req.params.id]);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Attendance Management
app.post('/api/attendance', async (req, res) => {
  try {
    const { classId, date, marks } = req.body;
    
    // First, delete existing attendance records for this class and date
    await db.run('DELETE FROM attendance WHERE studentId IN (SELECT id FROM students WHERE classId = ?) AND date = ?', [classId, date]);
    
    // Then insert new records
    for (const [studentIndex, status] of Object.entries(marks)) {
      const studentId = (await db.get('SELECT id FROM students WHERE classId = ? LIMIT 1 OFFSET ?', [classId, studentIndex])).id;
      if (studentId) {
        await db.run(
          'INSERT INTO attendance (studentId, date, status, markedBy) VALUES (?, ?, ?, ?)',
          [studentId, date, status, 'admin']
        );
      }
    }
    
    res.json({ message: 'Attendance saved successfully' });
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/attendance/:classId/:date', async (req, res) => {
  try {
    const { classId, date } = req.params;
    const attendance = await db.all(
      `SELECT s.id, s.fullName, a.status 
       FROM students s 
       LEFT JOIN attendance a ON s.id = a.studentId AND a.date = ?
       WHERE s.classId = ?`,
      [date, classId]
    );
    res.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/monthly-report/:classId/:year/:month', async (req, res) => {
  try {
    const { classId, year, month } = req.params;
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, parseInt(month, 10), 0).toISOString().split('T')[0];
    
    const attendance = await db.all(
      `SELECT s.id, s.fullName,
         SUM(CASE WHEN a.status = '✅' THEN 1 ELSE 0 END) as present,
         SUM(CASE WHEN a.status = '❌' THEN 1 ELSE 0 END) as absent
       FROM students s
       LEFT JOIN attendance a ON s.id = a.studentId AND a.date BETWEEN ? AND ?
       WHERE s.classId = ?
       GROUP BY s.id, s.fullName`,
      [startDate, endDate, classId]
    );
    
    res.json(attendance);
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave Management
app.post('/api/leave-requests', async (req, res) => {
  try {
    const { studentId, fromDate, toDate, reason } = req.body;
    await db.run(
      'INSERT INTO leave_requests (studentId, fromDate, toDate, reason) VALUES (?, ?, ?, ?)',
      [studentId, fromDate, toDate, reason]
    );
    res.json({ message: 'Leave request submitted successfully' });
  } catch (error) {
    console.error('Error submitting leave request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/leave-requests', async (req, res) => {
  try {
    const leaveRequests = await db.all(
      'SELECT * FROM leave_requests WHERE status = ? ORDER BY createdAt DESC',
      ['pending']
    );
    res.json(leaveRequests);
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/leave-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewedBy } = req.body;
    await db.run(
      'UPDATE leave_requests SET status = ?, reviewedBy = ?, reviewedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [status, reviewedBy, id]
    );
    res.json({ message: 'Leave request updated successfully' });
  } catch (error) {
    console.error('Error updating leave request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.run(
      'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, role, name]
    );
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );
    
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Student login endpoint
app.post('/api/students/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;
    const student = await db.get('SELECT * FROM students WHERE id = ?', [studentId]);
    
    if (!student) {
      return res.status(401).json({ error: 'Invalid student ID' });
    }
    
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    const token = jwt.sign(
      { id: student.id, role: 'student' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );
    
    res.json({ 
      token, 
      student: { 
        id: student.id, 
        fullName: student.fullName, 
        classId: student.classId,
        role: 'student'
      } 
    });
  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Protected routes
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const students = await db.all('SELECT * FROM students');
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
async function startServer() {
  try {
    console.log('Starting server initialization...');
    
    // Verify required environment variables
    if (!process.env.PORT) {
      console.error('Error: PORT environment variable is not set');
      process.exit(1);
    }
    
    console.log(`Using port: ${PORT}`);
    
    // Initialize database
    await initializeDatabase();
    
    console.log('Database initialized successfully');
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Visit: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
