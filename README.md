# QA Unified Dashboard

A comprehensive ticket resolution analytics dashboard with project management and data persistence.

## Features

- **Ticket Analysis**: Upload Excel files to analyze ticket resolution times
- **Project Management**: Organize analysis records by project
- **Month Selection**: Choose specific months to save from your analysis
- **Year Tracking**: Track data across different years
- **Real-time Dashboard**: View all saved records with filtering options
- **MySQL Database**: Persistent storage with a real backend server (containerized with Docker)
- **Beautiful UI**: Modern, responsive design with gradients and animations

## System Architecture

### Backend
- **Node.js + Express**: RESTful API server
- **MySQL 8.0**: Real database for persistent storage (containerized)
- **Docker & Docker Compose**: Container orchestration
- **CORS enabled**: For local development

### Frontend
- **HTML/CSS/JavaScript**: Vanilla JavaScript for simplicity
- **XLSX.js**: Excel file processing
- **Responsive Design**: Works on all screen sizes

## Installation

### Prerequisites
- Docker and Docker Compose installed

### Setup

1. **Start with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

   This will start both the MySQL database and Node.js application containers.

2. **Access the Application**:
   - Ticket Analyzer: http://localhost:3000
   - Dashboard: http://localhost:3000/dashboard
   - Projects: http://localhost:3000/projects

### (Optional) Local Development Setup

If you prefer to run without Docker:

1. **Install MySQL 8.0** locally and ensure it's running
2. **Install Node Dependencies**:
   ```bash
   npm install
   ```
3. **Set Database Environment Variables**:
   ```bash
   export DB_HOST=localhost
   export DB_PORT=3306
   export DB_USER=qa_user
   export DB_PASSWORD=qa_password
   export DB_NAME=qa_dashboard
   ```
4. **Start the Server**:
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Usage Guide

### 1. Create a Project

First, create a project to organize your analysis records:

1. Go to **Projects** page
2. Fill in the project name (required)
3. Add a description (optional)
4. Pick a project color
5. Click **Create Project**

### 2. Analyze Tickets

1. Go to **Ticket Analyzer** page
2. Click **Choose Excel File** and select your file
3. The system will analyze the data and show:
   - Overall summary
   - Quarterly breakdown (if applicable)
   - Monthly breakdown
4. Review the results

### 3. Save Analysis

After analyzing your file:

1. Click **Save Analysis** button
2. In the modal that appears:
   - Select the **Project** to associate this data with
   - Enter the **Year** (defaults to current year)
   - Select which **Months** to save (you can select all or specific ones)
3. Click **Save to Database**

### 4. View Dashboard

1. Go to **Dashboard** page
2. View all saved records
3. Filter by project using the dropdown
4. See detailed breakdown including:
   - Total tickets
   - Resolved in ≤2 days
   - Success rate
   - Monthly breakdown
5. Delete individual records or clear all

## Excel File Format

The system supports Excel files with the following column headers:

**Format 1 (Zendesk style)**:
- "Ticket created - Date"
- "Ticket solved - Date"

**Format 2 (Jira style)**:
- "Issue created date"
- "Issue resolution date"

Date formats supported:
- ISO: `2025-01-15`
- ISO with time: `2025-01-15 13:46:04`
- US format: `01/15/2025`
- Month names: `Jan 15 2025`

## Database Schema

### Projects Table
```sql
- id: INTEGER PRIMARY KEY
- name: TEXT (UNIQUE)
- description: TEXT
- color: TEXT
- created_at: DATETIME
```

### Analysis Records Table
```sql
- id: INTEGER PRIMARY KEY
- project_id: INTEGER (Foreign Key)
- filename: TEXT
- year: INTEGER
- months: TEXT (JSON array)
- total_tickets: INTEGER
- resolved_in_2days: INTEGER
- success_rate: REAL
- analysis_data: TEXT (JSON)
- created_at: DATETIME
```

## API Endpoints

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Analysis Records
- `GET /api/records` - Get all records
- `GET /api/records/project/:projectId` - Get records by project
- `POST /api/records` - Create record
- `DELETE /api/records/:id` - Delete record
- `DELETE /api/records` - Delete all records

## File Structure

```
qa-unified-dashboard/
├── server.js                    # Backend server
├── package.json                 # Dependencies
├── docker-compose.yml           # Docker Compose configuration
├── Dockerfile                   # Container image definition
├── generate-test-data.js        # Test data generator
├── ticket-analyzer.html         # Main analysis page
├── dashboard.html               # Records dashboard
├── projects.html                # Project management
├── project-statistics.html      # Project statistics page
├── src/static/                  # Static assets
│   ├── dashboard.css            # Dashboard styles
│   ├── footer.css               # Footer styles
│   └── ...                      # Other stylesheets
└── README.md                    # This file
```

## Technologies Used

- **Backend**: Node.js, Express, MySQL 8.0, Docker, CORS, Body-Parser
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Libraries**: XLSX.js for Excel processing
- **Database**: MySQL 8.0 (containerized)
- **Container**: Docker & Docker Compose

## Development

To contribute or modify:

1. The backend is in `server.js`
2. Each page is a standalone HTML file with embedded CSS and JavaScript
3. The database is automatically created on first run
4. All pages use the same API endpoints

## Tips

- Create projects before saving analysis data
- You can save multiple analyses for the same project
- Filter the dashboard by project to see project-specific data
- The monthly breakdown shows individual month performance
- Project colors help visually distinguish records

## License

MIT
