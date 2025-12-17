# Beach Academy - School Management System

A modern, responsive school management system with role-based dashboards, assignment workflows, timetables, and file uploads.

## Features

- **Role-Based Access**: Admin, Teacher, Parent, Student dashboards
- **Interactive Dashboards**: Stats, user management, class filtering
- **Assignment Workflow**: Teachers post assignments; students submit files; teachers grade
- **Timetable Management**: Create and manage class timetables
- **Grades & Attendance**: Track student grades and attendance
- **File Uploads**: Server-side file handling for assignments and submissions
- **CSV Import/Export**: Bulk import/export for timetables and assignments
- **Responsive Design**: Fully mobile-friendly UI with no content cropping

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML, CSS (in `docs/`)
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with JSONB key-value store
- **File Storage**: Disk-based uploads served via Express

## Quick Start

### Prerequisites

- Node.js (available in dev container)
- PostgreSQL running locally or via environment variable
- Bash terminal

### 1. Install Backend Dependencies

```bash
cd /workspaces/beachacademy
npm install
```

### 2. Set Up Environment

Create a `.env` file (or use `.env.sample` as template):

```bash
cp .env.sample .env
```

**For local Postgres:**
- Ensure Postgres is running
- Update `DATABASE_URL` if needed (default: `postgres://postgres:postgres@localhost:5432/beachacademy`)

### 3. Start the Backend Server

```bash
npm start
```

Server will listen on `http://localhost:4000`. Verify with `curl http://localhost:4000/health` (should return `{"ok":true}`).

### 4. Start the Frontend (separate terminal)

```bash
cd /workspaces/beachacademy/docs

# Option A: Python's built-in server
python3 -m http.server 8000

# Option B: Node.js http-server
npx http-server -p 8000
```

Open browser to `http://localhost:8000`

### 5. Login

Use credentials from `docs/data/users-full.json`. Example users:

- **Admin**: `admin@school.com` / `password123`
- **Teacher**: `teacher@school.com` / `password123`
- **Student**: `student@school.com` / `password123`
- **Parent**: `parent@school.com` / `password123`

(Check `docs/data/users-full.json` for exact credentials)

## Project Structure

```
.
├── server.js              # Express backend
├── package.json           # Node dependencies
├── .env.sample            # Environment template
├── uploads/               # Uploaded files (auto-created)
└── docs/                  # Frontend (single-page app)
    ├── index.html         # Main HTML
    ├── app.js             # Frontend logic
    ├── styles.css         # Responsive CSS
    └── data/
        ├── users-full.json/.csv      # User data (50 records)
        └── subjects-full.json/.csv   # Subject list
```

## API Endpoints

### File Upload

- **POST** `/upload` - Upload a file
  - Request: `multipart/form-data` with `file` field
  - Response: `{ ok: true, name: "...", url: "/uploads/..." }`

### Key-Value Store (Postgres JSONB)

- **GET** `/kv/:key` - Retrieve JSON value
- **PUT** `/kv/:key` - Store/update JSON value (body = JSON)
- **DELETE** `/kv/:key` - Delete key

### Health Check

- **GET** `/health` - Server status
  - Response: `{ ok: true }`

## Frontend Data Persistence

- **Current**: Uses browser localStorage (survives page reload)
- **Future**: Can be migrated to server `/kv/:key` endpoints with localStorage fallback

### Available Storage Keys

- `usersData` - User list
- `assignments` - Assignment records with submissions
- `timetables` - Class timetables
- `token` - Auth token (localStorage)
- `user` - Current user (localStorage)

## Responsive Design

UI automatically adapts to screen sizes:

- **Desktop (1024px+)**: Full sidebar, optimized tables
- **Tablet (768px-1023px)**: Collapsible sidebar, stacked buttons
- **Mobile (480px-767px)**: Horizontal-scrolling tables, smaller fonts
- **Small Mobile (<480px)**: Optimized spacing, compact buttons, touchable areas

All content is visible—no cropping or overflow issues.

## CSV Import/Export

### Timetables

- **Export**: Click button next to timetable; downloads `timetable-{class}.csv`
- **Import**: Select CSV file with format: `Day,Period1,Period2,Period3,Period4`

### Assignments

- **Export**: From Assignments view; downloads `assignments.csv`
- **Import**: Upload CSV with columns: `ID,Title,Class,Due,By,Submissions`

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 4000 (backend) or 8000 (frontend)
lsof -i :4000
kill -9 <PID>
```

### Database Connection Error

```bash
# Check Postgres is running
psql -U postgres -d beachacademy -c "SELECT 1;"

# Update DATABASE_URL in .env if needed
```

### Frontend Can't Upload Files

- Ensure backend is running on `http://localhost:4000`
- Check `/uploads` directory exists
- Browser console should show upload errors

## Development Notes

- Frontend data flow: `app.js` handles all logic; uses localStorage by default
- Server can be accessed from frontend at `window.SERVER_URL` (currently defaults to empty string = same origin)
- To enable server persistence: set `window.SERVER_URL = 'http://localhost:4000'` in frontend, then update `loadUsers`, `saveUsers`, `loadAssignments`, `saveAssignments` to use `/kv/` endpoints

## Next Steps (Optional)

1. Wire frontend to use server `/kv/` endpoints instead of localStorage
2. Add authentication/authorization middleware to server
3. Implement real Postgres relationships (instead of JSON)
4. Add file size limits and security validations
5. Deploy to production (Docker, cloud platform)

---

**Questions?** Check the code comments in `docs/app.js` and `server.js` for implementation details.
