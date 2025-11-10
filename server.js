const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// Database setup
const db = new sqlite3.Database('./qa_dashboard.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initDatabase();
    }
});

// Initialize database tables
function initDatabase() {
    db.serialize(() => {
        // Projects table
        db.run(`
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Analysis records table
        db.run(`
            CREATE TABLE IF NOT EXISTS analysis_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                filename TEXT,
                year INTEGER,
                months TEXT,
                total_tickets INTEGER,
                resolved_in_2days INTEGER,
                success_rate REAL,
                analysis_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
        `);

        console.log('Database tables initialized');
    });
}

// ==================== PROJECTS API ====================

// Get all projects
app.get('/api/projects', (req, res) => {
    db.all('SELECT * FROM projects ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ projects: rows });
    });
});

// Get single project
app.get('/api/projects/:id', (req, res) => {
    db.get('SELECT * FROM projects WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json({ project: row });
    });
});

// Create project
app.post('/api/projects', (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        res.status(400).json({ error: 'Project name is required' });
        return;
    }

    db.run(
        'INSERT INTO projects (name, description) VALUES (?, ?)',
        [name, description],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    res.status(400).json({ error: 'Project name already exists' });
                } else {
                    res.status(500).json({ error: err.message });
                }
                return;
            }
            res.json({
                message: 'Project created successfully',
                project: {
                    id: this.lastID,
                    name,
                    description
                }
            });
        }
    );
});

// Update project
app.put('/api/projects/:id', (req, res) => {
    const { name, description, color } = req.body;

    db.run(
        'UPDATE projects SET name = ?, description = ?, color = ? WHERE id = ?',
        [name, description, color, req.params.id],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            if (this.changes === 0) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }
            res.json({ message: 'Project updated successfully' });
        }
    );
});

// Delete project
app.delete('/api/projects/:id', (req, res) => {
    db.run('DELETE FROM projects WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json({ message: 'Project deleted successfully' });
    });
});

// ==================== ANALYSIS RECORDS API ====================

// Get all analysis records
app.get('/api/records', (req, res) => {
    const query = `
        SELECT
            r.*,
            p.name as project_name
        FROM analysis_records r
        LEFT JOIN projects p ON r.project_id = p.id
        ORDER BY r.created_at DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ records: rows });
    });
});

// Get aggregated data grouped by project, year, and quarter
app.get('/api/records/aggregated', (req, res) => {
    const query = `
        SELECT
            r.*,
            p.name as project_name,
            p.id as project_id
        FROM analysis_records r
        LEFT JOIN projects p ON r.project_id = p.id
        ORDER BY p.name, r.year DESC, r.created_at DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Group by project, year, and quarter
        const aggregated = {};

        rows.forEach(record => {
            const projectKey = record.project_id || 'unassigned';
            const year = record.year;
            const months = JSON.parse(record.months || '[]');

            // Determine quarters from months
            const quarters = new Set();
            const monthToQuarter = {
                'January': 'Q1', 'February': 'Q1', 'March': 'Q1',
                'April': 'Q2', 'May': 'Q2', 'June': 'Q2',
                'July': 'Q3', 'August': 'Q3', 'September': 'Q3',
                'October': 'Q4', 'November': 'Q4', 'December': 'Q4'
            };

            months.forEach(month => {
                // Try to match month name
                const monthName = month.trim();
                for (const [key, quarter] of Object.entries(monthToQuarter)) {
                    if (monthName.toLowerCase().includes(key.toLowerCase())) {
                        quarters.add(quarter);
                        break;
                    }
                }
            });

            if (!aggregated[projectKey]) {
                aggregated[projectKey] = {
                    project_id: record.project_id,
                    project_name: record.project_name || 'Unassigned',
                    years: {}
                };
            }

            if (!aggregated[projectKey].years[year]) {
                aggregated[projectKey].years[year] = {
                    quarters: {}
                };
            }

            quarters.forEach(quarter => {
                if (!aggregated[projectKey].years[year].quarters[quarter]) {
                    aggregated[projectKey].years[year].quarters[quarter] = {
                        total_tickets: 0,
                        resolved_in_2days: 0,
                        records: [],
                        months: {} // Add monthly breakdown
                    };
                }

                // Aggregate data for each month in this quarter
                // Parse analysis_data to get monthly breakdown
                let analysisDataArray = [];
                try {
                    analysisDataArray = typeof record.analysis_data === 'string'
                        ? JSON.parse(record.analysis_data)
                        : record.analysis_data || [];
                } catch (e) {
                    analysisDataArray = [];
                }

                // If analysis_data is an array, process each month's data
                if (Array.isArray(analysisDataArray)) {
                    analysisDataArray.forEach(monthInfo => {
                        const displayName = monthInfo.displayName || '';
                        const totalTickets = monthInfo.totalTickets || 0;
                        const resolvedIn2Days = monthInfo.resolvedIn2Days || 0;

                        // Find which quarter this month belongs to
                        for (const [monthKey, monthQuarter] of Object.entries(monthToQuarter)) {
                            if (displayName.toLowerCase().includes(monthKey.toLowerCase()) && monthQuarter === quarter) {
                                if (!aggregated[projectKey].years[year].quarters[quarter].months[monthKey]) {
                                    aggregated[projectKey].years[year].quarters[quarter].months[monthKey] = {
                                        name: monthKey,
                                        total_tickets: 0,
                                        resolved_in_2days: 0,
                                        records: []
                                    };
                                }

                                aggregated[projectKey].years[year].quarters[quarter].months[monthKey].total_tickets += totalTickets;
                                aggregated[projectKey].years[year].quarters[quarter].months[monthKey].resolved_in_2days += resolvedIn2Days;
                                aggregated[projectKey].years[year].quarters[quarter].months[monthKey].records.push({
                                    id: record.id,
                                    filename: record.filename,
                                    total_tickets: totalTickets,
                                    resolved_in_2days: resolvedIn2Days
                                });
                                break;
                            }
                        }
                    });
                }

                aggregated[projectKey].years[year].quarters[quarter].total_tickets += record.total_tickets;
                aggregated[projectKey].years[year].quarters[quarter].resolved_in_2days += record.resolved_in_2days;
                aggregated[projectKey].years[year].quarters[quarter].records.push({
                    id: record.id,
                    filename: record.filename,
                    months: months,
                    total_tickets: record.total_tickets,
                    resolved_in_2days: record.resolved_in_2days,
                    success_rate: record.success_rate,
                    analysis_data: record.analysis_data,
                    created_at: record.created_at
                });
            });
        });

        // Calculate success rates for quarters and months
        Object.values(aggregated).forEach(project => {
            Object.values(project.years).forEach(year => {
                Object.values(year.quarters).forEach(quarter => {
                    if (quarter.total_tickets > 0) {
                        quarter.success_rate = ((quarter.resolved_in_2days / quarter.total_tickets) * 100).toFixed(2);
                    } else {
                        quarter.success_rate = 0;
                    }

                    // Calculate success rates for months within this quarter
                    Object.values(quarter.months).forEach(month => {
                        if (month.total_tickets > 0) {
                            month.success_rate = ((month.resolved_in_2days / month.total_tickets) * 100).toFixed(2);
                        } else {
                            month.success_rate = 0;
                        }
                    });
                });
            });
        });

        res.json({ aggregated });
    });
});

// Get records by project
app.get('/api/records/project/:projectId', (req, res) => {
    const query = `
        SELECT
            r.*,
            p.name as project_name
        FROM analysis_records r
        LEFT JOIN projects p ON r.project_id = p.id
        WHERE r.project_id = ?
        ORDER BY r.created_at DESC
    `;

    db.all(query, [req.params.projectId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ records: rows });
    });
});

// Create analysis record
app.post('/api/records', (req, res) => {
    const {
        project_id,
        filename,
        year,
        months,
        total_tickets,
        resolved_in_2days,
        success_rate,
        analysis_data
    } = req.body;

    if (!project_id || !filename || !year || !months) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    db.run(
        `INSERT INTO analysis_records
        (project_id, filename, year, months, total_tickets, resolved_in_2days, success_rate, analysis_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            project_id,
            filename,
            year,
            JSON.stringify(months),
            total_tickets,
            resolved_in_2days,
            success_rate,
            JSON.stringify(analysis_data)
        ],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({
                message: 'Record saved successfully',
                record: {
                    id: this.lastID
                }
            });
        }
    );
});

// Delete analysis record
app.delete('/api/records/:id', (req, res) => {
    db.run('DELETE FROM analysis_records WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (this.changes === 0) {
            res.status(404).json({ error: 'Record not found' });
            return;
        }
        res.json({ message: 'Record deleted successfully' });
    });
});

// Delete all records
app.delete('/api/records', (req, res) => {
    db.run('DELETE FROM analysis_records', [], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'All records deleted successfully', deleted: this.changes });
    });
});

// ==================== SERVE HTML PAGES ====================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'ticket-analyzer.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/projects', (req, res) => {
    res.sendFile(path.join(__dirname, 'projects.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`Projects: http://localhost:${PORT}/projects`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        }
        console.log('\nDatabase connection closed');
        process.exit(0);
    });
});
