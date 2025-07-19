# Madrasa Saifiyah Bagasara Attendance System

A comprehensive attendance management system for Madrasa Saifiyah Bagasara, built with Node.js, Express, and SQLite.

## Features

- **Multi-role Access**: Separate interfaces for Admins, Teachers, and Students
- **Attendance Management**: Mark and track student attendance
- **Leave Management**: Submit and approve leave requests
- **Reporting**: Generate attendance reports
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BGS-M_Saifiyah
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
4. **Initialize the database**
   ```bash
   node import-students.js
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Open `http://localhost:3000` in your web browser

## Project Structure

```
BGS-M_Saifiyah/
├── public/               # Frontend files (HTML, CSS, JS, images)
├── database/             # SQLite database files
├── controllers/          # Route controllers
├── models/               # Database models
├── routes/               # API routes
├── middleware/           # Express middleware
├── .env                  # Environment variables
├── server.js             # Main application file
├── import-students.js    # Script to import student data
└── package.json          # Project configuration
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get a specific student
- `POST /api/students` - Add a new student
- `PUT /api/students/:id` - Update a student
- `DELETE /api/students/:id` - Delete a student

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/report` - Generate attendance report

### Leave Requests
- `GET /api/leave` - Get leave requests
- `POST /api/leave` - Submit a leave request
- `PUT /api/leave/:id/status` - Update leave request status

## Development

- **Development server**: `npm run dev`
- **Production build**: `npm start`

## License

This project is licensed under the MIT License.

## Contact

For any questions or support, please contact the development team.
