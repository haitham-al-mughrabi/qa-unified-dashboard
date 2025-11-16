# QA Unified Dashboard - Project Context

## Project Overview

The QA Unified Dashboard is a comprehensive ticket resolution analytics dashboard with project management and data persistence capabilities. This is a Node.js/Express-based web application that provides tools for analyzing Excel files containing ticket data (from systems like Zendesk and Jira) and visualizing the results in an interactive dashboard.

### Key Features:
- **Ticket Analysis**: Upload Excel files to analyze ticket resolution times
- **Project Management**: Organize analysis records by project
- **Month Selection**: Choose specific months to save from your analysis
- **Year Tracking**: Track data across different years
- **Real-time Dashboard**: View all saved records with filtering options
- **MySQL Database**: Persistent storage with a real backend server (containerized with Docker)
- **Beautiful UI**: Modern, responsive design with gradients and animations

### Architecture:
- **Backend**: Node.js + Express web server with RESTful API
- **Database**: MySQL 8.0 for persistent storage (containerized)
- **Frontend**: HTML/CSS/JavaScript with vanilla JavaScript (no frameworks)
- **Libraries**: XLSX.js for Excel file processing, Font Awesome for icons

## File Structure

```
qa-unified-dashboard/
├── server.js              # Backend server with Express and MySQL
├── package.json           # Dependencies and scripts
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Container image definition
├── ticket-analyzer.html   # Main analysis page for Excel uploads
├── dashboard.html         # Records dashboard with filtering
├── projects.html          # Project management interface
├── README.md              # Project documentation
├── FEATURES.md            # Complete feature list
├── NEW_FEATURES.md        # Detailed new features documentation
├── DASHBOARD_REDESIGN_COMPLETE.md  # Dashboard redesign guide
├── generate-test-data.js  # Test data generation script
├── migrate_remove_color.js  # Database migration script
├── dashboard-old-backup.html  # Backup of old dashboard
├── dashboard-old.html     # Old dashboard version
├── projects-old.html      # Old projects page
├── projects-backup.html   # Backup of projects page
└── database.db            # Legacy database file
```

## Technology Stack

### Backend Technologies
- **Node.js**: JavaScript runtime environment
- **Express**: Web application framework
- **MySQL2**: Promise-based MySQL client
- **CORS**: Cross-Origin Resource Sharing middleware
- **Body Parser**: Middleware for parsing request bodies
- **Nodemon**: Development tool for auto-restart on file changes

### Frontend Technologies
- **HTML5**: Structure and content
- **CSS3**: Styling with modern features (gradients, animations, flexbox, grid)
- **JavaScript ES6+**: Client-side functionality with async/await
- **XLSX.js**: Excel file processing library
- **Font Awesome**: Icon library
- **Google Fonts**: Inter font family

## System Architecture

### Backend API Endpoints

#### Projects API
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Analysis Records API
- `GET /api/records` - Get all records
- `GET /api/records/project/:projectId` - Get records by project
- `POST /api/records` - Create record
- `DELETE /api/records/:id` - Delete record
- `DELETE /api/records` - Delete all records
- `GET /api/records/aggregated` - Get aggregated data grouped by project, year, and quarter

### Database Schema

#### Projects Table
```
- id: INTEGER PRIMARY KEY AUTOINCREMENT
- name: TEXT NOT NULL UNIQUE
- description: TEXT
- created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
```

#### Analysis Records Table
```
- id: INTEGER PRIMARY KEY AUTOINCREMENT
- project_id: INTEGER (Foreign Key to projects)
- filename: TEXT
- year: INTEGER
- months: TEXT (JSON array)
- total_tickets: INTEGER
- resolved_in_2days: INTEGER
- success_rate: REAL
- analysis_data: TEXT (JSON)
- created_at: DATETIME DEFAULT CURRENT_TIMESTAMP
```

### Frontend Pages

#### Ticket Analyzer (`/`)
- Excel file upload interface with drag-and-drop support
- Support for Zendesk and Jira Excel formats
- Real-time analysis display with monthly breakdown
- Save functionality with project assignment and month selection

#### Dashboard (`/dashboard`)
- Hierarchical view: Project → Year → Quarter
- Advanced filtering options (project, year, quarter)
- Include/exclude new data toggle for comparison analysis
- Individual record management with checkboxes
- Real-time metric recalculation
- Quarter expansion to view detailed records

#### Projects (`/projects`)
- Create, view, and delete project management
- Custom project colors and descriptions
- Confirmation modals for destructive actions

## Development Workflow

### Setup and Installation
1. Install dependencies: `npm install`
2. Start the server: `npm start` or `npm run dev` (with auto-reload)
3. Access the application:
   - Ticket Analyzer: http://localhost:3000
   - Dashboard: http://localhost:3000/dashboard
   - Projects: http://localhost:3000/projects

### Key Development Patterns
- **API-first approach**: All data operations go through the RESTful API
- **Client-side filtering**: Dashboard filtering happens in the browser for performance
- **Modular CSS**: Consistent design system using CSS variables
- **Error handling**: Comprehensive client and server-side error handling
- **Responsive design**: Works on all screen sizes with mobile-first approach

## Key Features in Detail

### Excel File Processing
The application supports two main formats:
- **Zendesk style**: "Ticket created - Date" and "Ticket solved - Date"
- **Jira style**: "Issue created date" and "Issue resolution date"

Supports various date formats including ISO, US format, and month names.

### Dashboard Filtering System
1. **Project Filter**: Select specific projects or view all projects
2. **Year Filter**: Filter by specific year or view all years
3. **Quarter Filter**: Show specific quarters (Q1, Q2, Q3, Q4)
4. **Include New Data Toggle**: Option to exclude most recent uploads from calculations

### Individual Record Management
- Each record has a checkbox to include/exclude from calculations
- Excluded records appear dimmed with 50% opacity
- Metrics update in real-time when toggling records
- Delete functionality with confirmation dialog

### Month Name Customization
When saving analysis data, users can customize month names:
- Quick pick dropdown with standard month names
- Custom text input for non-standard periods
- Names are saved to the database and displayed in the dashboard

## Design Principles

1. **Simplicity**: Clean, intuitive interface with minimal cognitive load
2. **Consistency**: Uniform design patterns across all pages
3. **Feedback**: Clear notifications and visual feedback for user actions
4. **Accessibility**: Good color contrast and readable fonts
5. **Responsiveness**: Works on all device sizes
6. **Performance**: Fast interactions with optimized animations

## User Workflows

### First-Time Setup
1. Start server: `npm start`
2. Create a project at `/projects`
3. Upload Excel file at `/`
4. Save analysis to project
5. View in dashboard

### Regular Usage
1. Open Ticket Analyzer
2. Upload Excel file
3. Review analysis
4. Click "Save Analysis"
5. Select project, year, and months
6. Save to database
7. View in dashboard

### Data Management
1. Go to Dashboard
2. Filter by project (optional)
3. Review records
4. Delete or exclude as needed
5. Observe real-time metric updates

## Performance and Security

### Performance
- Fast Excel processing with XLSX.js
- Client-side filtering for instant response
- Optimized CSS animations
- Database indexing for quick queries

### Security
- MySQL database in Docker container (centralized data management)
- No external API calls (except CDN libraries)
- No authentication required (local use only)
- Input validation on both client and server

## Customization and Extensibility

The application is designed to be easily customizable:
- CSS variables for consistent theming
- Clear API structure for backend modifications
- Modular JavaScript for frontend enhancements
- MySQL database with Docker containerization for scalability

## Testing and Data Generation

The project includes a test data generation script (`generate-test-data.js`) that can create sample data for testing purposes. This helps verify functionality without requiring real Excel files during development.

## Troubleshooting

### Common Issues
- **File upload errors**: Check Excel file format and column headers
- **Database connection**: Ensure the database file is writable
- **CORS issues**: The server enables CORS for local development
- **Memory limitations**: Large Excel files may require increased memory limits

### Error Handling
- Comprehensive error handling on both client and server
- User-friendly error messages
- Graceful degradation when features are unavailable

This QA Unified Dashboard provides a complete solution for analyzing ticket resolution data with project organization, data persistence, and an intuitive user interface.