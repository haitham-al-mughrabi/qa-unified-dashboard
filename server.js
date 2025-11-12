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

// Get project statistics (must be before :id route to avoid route shadowing)
app.get('/api/projects/:id/statistics', (req, res) => {
    const projectId = req.params.id;

    const query = `
        SELECT
            COUNT(*) as totalTickets,
            SUM(CASE WHEN resolved_in_2days > 0 THEN 1 ELSE 0 END) as resolvedTickets,
            SUM(resolved_in_2days) as within2Days,
            SUM(total_tickets) as allTickets
        FROM analysis_records
        WHERE project_id = ?
    `;

    db.get(query, [projectId], (err, row) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
            return;
        }

        // Calculate statistics
        const totalTickets = row.allTickets || 0;
        const resolvedTickets = row.resolvedTickets || 0;
        const within2Days = row.within2Days || 0;
        const resolutionRate = totalTickets > 0 ? ((within2Days / totalTickets) * 100).toFixed(2) : 0;

        res.json({
            success: true,
            statistics: {
                totalTickets: totalTickets,
                resolvedTickets: resolvedTickets,
                within2Days: within2Days,
                resolutionRate: parseFloat(resolutionRate)
            }
        });
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

// ==================== STATISTICS API ====================

// Get statistics with flexible time period comparison
app.get('/api/statistics/compare', (req, res) => {
    const projectId = req.query.projectId;

    // Primary period parameters
    const primaryYear = req.query.primaryYear ? parseInt(req.query.primaryYear) : null;
    const primaryQuarter = req.query.primaryQuarter; // Q1, Q2, Q3, Q4
    const primaryMonth = req.query.primaryMonth; // 1-12

    // Comparison period parameters
    const compareYear = req.query.compareYear ? parseInt(req.query.compareYear) : null;
    const compareQuarter = req.query.compareQuarter;
    const compareMonth = req.query.compareMonth;

    if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
    }

    // Helper function to get quarter months
    const getQuarterMonths = (quarter) => {
        const quarters = {
            'Q1': [1, 2, 3],
            'Q2': [4, 5, 6],
            'Q3': [7, 8, 9],
            'Q4': [10, 11, 12]
        };
        return quarters[quarter] || [];
    };

    // Helper function to filter records by period
    const filterByPeriod = (records, year, quarter, month) => {
        return records.filter(record => {
            if (year && record.year !== year) return false;

            if (quarter) {
                const quarterMonths = getQuarterMonths(quarter);
                if (!quarterMonths.includes(record.month)) return false;
            }

            if (month && record.month !== parseInt(month)) return false;

            return true;
        });
    };

    // Helper function to calculate statistics
    const calculateStats = (records) => {
        const totalTickets = records.reduce((sum, r) => sum + (r.total_tickets || 0), 0);
        const resolvedIn2Days = records.reduce((sum, r) => sum + (r.resolved_in_2days || 0), 0);
        const resolvedAfter2Days = records.reduce((sum, r) => sum + (r.resolved_after_2days || 0), 0);
        const successRate = totalTickets > 0 ? ((resolvedIn2Days / totalTickets) * 100).toFixed(2) : 0;

        return {
            totalTickets,
            resolvedIn2Days,
            resolvedAfter2Days,
            successRate: parseFloat(successRate),
            records
        };
    };

    // Query to get all records for the project
    const query = `
        SELECT
            r.*,
            p.name as project_name
        FROM analysis_records r
        LEFT JOIN projects p ON r.project_id = p.id
        WHERE r.project_id = ?
        ORDER BY r.year DESC, r.created_at DESC
    `;

    db.all(query, [projectId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // Transform records into monthly breakdown
        const allRecords = [];
        rows.forEach(row => {
            try {
                const analysisData = JSON.parse(row.analysis_data || '[]');

                if (Array.isArray(analysisData)) {
                    analysisData.forEach(monthData => {
                        allRecords.push({
                            id: row.id,
                            project_id: row.project_id,
                            project_name: row.project_name,
                            filename: row.filename,
                            created_at: row.created_at,
                            year: row.year,
                            month: monthData.month,
                            displayName: monthData.displayName,
                            total_tickets: monthData.totalTickets || 0,
                            resolved_in_2days: monthData.resolvedIn2Days || 0,
                            resolved_after_2days: monthData.resolvedAfter2Days || 0,
                            success_rate: parseFloat(monthData.successRate) || 0
                        });
                    });
                }
            } catch (e) {
                console.error('Error parsing analysis data:', e);
            }
        });

        // Filter and calculate primary period statistics
        const primaryRecords = filterByPeriod(allRecords, primaryYear, primaryQuarter, primaryMonth);
        const primaryStats = calculateStats(primaryRecords);

        // Filter and calculate comparison period statistics if specified
        let compareStats = null;
        if (compareYear || compareQuarter || compareMonth) {
            const compareRecords = filterByPeriod(allRecords, compareYear, compareQuarter, compareMonth);
            compareStats = calculateStats(compareRecords);
        }

        // Calculate changes between periods
        let changes = null;
        if (compareStats) {
            const totalTicketsChange = primaryStats.totalTickets - compareStats.totalTickets;
            const resolvedIn2DaysChange = primaryStats.resolvedIn2Days - compareStats.resolvedIn2Days;
            const successRateChange = primaryStats.successRate - compareStats.successRate;

            changes = {
                totalTickets: totalTicketsChange,
                totalTicketsPercent: compareStats.totalTickets > 0
                    ? ((totalTicketsChange / compareStats.totalTickets) * 100).toFixed(2)
                    : 0,
                resolvedIn2Days: resolvedIn2DaysChange,
                resolvedIn2DaysPercent: compareStats.resolvedIn2Days > 0
                    ? ((resolvedIn2DaysChange / compareStats.resolvedIn2Days) * 100).toFixed(2)
                    : 0,
                successRate: successRateChange.toFixed(2),
                successRatePercent: successRateChange.toFixed(2)
            };
        }

        res.json({
            success: true,
            primary: primaryStats,
            compare: compareStats,
            changes: changes
        });
    });
});

// ==================== DASHBOARD API ====================

// Get dashboard statistics with filtering
app.get('/api/dashboard', (req, res) => {
    const projectId = req.query.projectId;
    const period = req.query.period || 'all';

    let query = `
        SELECT
            r.*,
            p.name as project_name
        FROM analysis_records r
        LEFT JOIN projects p ON r.project_id = p.id
    `;

    const params = [];

    // Filter by project if specified
    if (projectId && projectId !== 'all') {
        query += ' WHERE r.project_id = ?';
        params.push(projectId);
    }

    query += ' ORDER BY r.created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Transform records into the format expected by frontend
        const records = [];
        rows.forEach(row => {
            // Parse analysis_data to get monthly breakdown
            try {
                const analysisData = JSON.parse(row.analysis_data || '[]');

                // Add one record per monthly data point
                if (Array.isArray(analysisData)) {
                    analysisData.forEach(monthData => {
                        records.push({
                            id: row.id,
                            project_id: row.project_id,
                            project_name: row.project_name,
                            filename: row.filename,
                            created_at: row.created_at,
                            year: row.year,
                            month: monthData.month,
                            displayName: monthData.displayName,
                            total_tickets: monthData.totalTickets || 0,
                            resolved_in_2days: monthData.resolvedIn2Days || 0,
                            resolved_after_2days: monthData.resolvedAfter2Days || 0,
                            success_rate: parseFloat(monthData.successRate) || 0,
                            status: monthData.resolvedIn2Days > 0 ? 'resolved' : 'pending',
                            resolution_type: monthData.resolvedIn2Days > 0 ? 'within_2_days' : 'after_2_days'
                        });
                    });
                }
            } catch (e) {
                // If analysis_data is not valid JSON, create a single record from aggregate data
                records.push({
                    id: row.id,
                    project_id: row.project_id,
                    project_name: row.project_name,
                    filename: row.filename,
                    created_at: row.created_at,
                    year: row.year,
                    total_tickets: row.total_tickets,
                    resolved_in_2days: row.resolved_in_2days,
                    success_rate: row.success_rate,
                    status: row.resolved_in_2days > 0 ? 'resolved' : 'pending',
                    resolution_type: row.resolved_in_2days > 0 ? 'within_2_days' : 'after_2_days'
                });
            }
        });

        res.json({ records });
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

app.get('/statistics', (req, res) => {
    res.sendFile(path.join(__dirname, 'statistics.html'));
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
