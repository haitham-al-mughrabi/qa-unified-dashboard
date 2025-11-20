const express = require('express');
const mysql = require('mysql2/promise');
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

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'qa_user',
    password: process.env.DB_PASSWORD || 'qa_password',
    database: process.env.DB_NAME || 'qa_dashboard',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Create connection pool
let pool;
let dbConnected = false;

async function initializeDatabase() {
    try {
        pool = mysql.createPool(dbConfig);

        // Test connection
        const connection = await pool.getConnection();
        console.log('Connected to MySQL database');
        connection.release();

        // Create tables
        await createTables();
        dbConnected = true;
    } catch (error) {
        console.error('Error connecting to MySQL database:', error);
        // Retry connection after 5 seconds
        setTimeout(initializeDatabase, 5000);
    }
}

// Create database tables
async function createTables() {
    try {
        const connection = await pool.getConnection();

        // Portfolios table (must be created first for foreign key)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS portfolios (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                color VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Projects table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS projects (
                id INT PRIMARY KEY AUTO_INCREMENT,
                portfolio_id INT,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                color VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL,
                INDEX idx_portfolio_id (portfolio_id)
            )
        `);

        // Check if portfolio_id column exists, if not add it (for existing databases)
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'projects'
            AND COLUMN_NAME = 'portfolio_id'
        `);

        if (columns.length === 0) {
            // Add portfolio_id column to existing projects table
            await connection.execute(`
                ALTER TABLE projects
                ADD COLUMN portfolio_id INT,
                ADD FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL,
                ADD INDEX idx_portfolio_id (portfolio_id)
            `);
            console.log('Added portfolio_id column to projects table');
        }

        // Check if color column exists in projects, if not add it
        const [colorColumns] = await connection.execute(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'projects'
            AND COLUMN_NAME = 'color'
        `);

        if (colorColumns.length === 0) {
            await connection.execute(`
                ALTER TABLE projects ADD COLUMN color VARCHAR(50)
            `);
            console.log('Added color column to projects table');
        }

        // Analysis records table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS analysis_records (
                id INT PRIMARY KEY AUTO_INCREMENT,
                project_id INT,
                filename VARCHAR(255),
                year INT,
                months JSON,
                total_tickets INT,
                resolved_in_2days INT,
                success_rate FLOAT,
                analysis_data LONGTEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                INDEX idx_project_id (project_id),
                INDEX idx_year (year)
            )
        `);

        // Performance statistics table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS performance_statistics (
                id INT PRIMARY KEY AUTO_INCREMENT,
                project_id INT,
                project_name VARCHAR(255),
                year INT,
                quarter VARCHAR(10),
                month VARCHAR(50),
                value FLOAT,
                filename VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                INDEX idx_project_id (project_id),
                INDEX idx_year (year),
                INDEX idx_quarter (quarter)
            )
        `);

        // Project availability table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS project_availability (
                id INT PRIMARY KEY AUTO_INCREMENT,
                project_id INT,
                project_name VARCHAR(255),
                year INT,
                quarter VARCHAR(10),
                month VARCHAR(50),
                value FLOAT,
                filename VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                INDEX idx_project_id (project_id),
                INDEX idx_year (year),
                INDEX idx_quarter (quarter)
            )
        `);

        connection.release();
        console.log('Database tables initialized');
    } catch (error) {
        console.error('Error creating tables:', error);
        throw error;
    }
}

// Helper function to execute queries
async function query(sql, params = []) {
    if (!dbConnected) {
        throw new Error('Database not connected');
    }
    const connection = await pool.getConnection();
    try {
        const [results] = await connection.execute(sql, params);
        return results;
    } finally {
        connection.release();
    }
}

// Initialize database on startup
initializeDatabase();

// Helper function to safely parse JSON from MySQL (handles both string and already-parsed data)
function safeJsonParse(data, defaultValue = []) {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (e) {
            return defaultValue;
        }
    }
    return Array.isArray(data) || typeof data === 'object' ? data : defaultValue;
}

// Helper function to extract month name and determine quarter
function getMonthQuarter(monthString) {
    const monthToQuarter = {
        'january': 'Q1', 'february': 'Q1', 'march': 'Q1',
        'april': 'Q2', 'may': 'Q2', 'june': 'Q2',
        'july': 'Q3', 'august': 'Q3', 'september': 'Q3',
        'october': 'Q4', 'november': 'Q4', 'december': 'Q4',
        'jan': 'Q1', 'feb': 'Q1', 'mar': 'Q1',
        'apr': 'Q2', 'jun': 'Q2',
        'jul': 'Q3', 'aug': 'Q3', 'sep': 'Q3', 'sept': 'Q3',
        'oct': 'Q4', 'nov': 'Q4', 'dec': 'Q4'
    };

    // Extract the first word (month name) from the string
    const parts = monthString.trim().split(/\s+/);
    if (parts.length === 0) return null;

    const monthName = parts[0].toLowerCase();
    return monthToQuarter[monthName] || null;
}

// ==================== PORTFOLIOS API ====================

// Get all portfolios
app.get('/api/portfolios', async (req, res) => {
    try {
        const portfolios = await query(`
            SELECT
                p.*,
                COUNT(DISTINCT pr.id) as project_count
            FROM portfolios p
            LEFT JOIN projects pr ON p.id = pr.portfolio_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);
        res.json({ portfolios });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single portfolio
app.get('/api/portfolios/:id', async (req, res) => {
    try {
        const portfolios = await query('SELECT * FROM portfolios WHERE id = ?', [req.params.id]);
        if (portfolios.length === 0) {
            res.status(404).json({ error: 'Portfolio not found' });
            return;
        }

        // Get associated projects
        const projects = await query('SELECT * FROM projects WHERE portfolio_id = ?', [req.params.id]);

        res.json({
            portfolio: portfolios[0],
            projects
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create portfolio
app.post('/api/portfolios', async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Portfolio name is required' });
            return;
        }

        const result = await query(
            'INSERT INTO portfolios (name, description) VALUES (?, ?)',
            [name, description]
        );

        res.json({
            message: 'Portfolio created successfully',
            portfolio: {
                id: result.insertId,
                name,
                description
            }
        });
    } catch (error) {
        if (error.message.includes('Duplicate entry')) {
            res.status(400).json({ error: 'Portfolio name already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Update portfolio
app.put('/api/portfolios/:id', async (req, res) => {
    try {
        const { name, description } = req.body;

        const result = await query(
            'UPDATE portfolios SET name = ?, description = ? WHERE id = ?',
            [name, description, req.params.id]
        );

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Portfolio not found' });
            return;
        }

        res.json({ message: 'Portfolio updated successfully' });
    } catch (error) {
        if (error.message.includes('Duplicate entry')) {
            res.status(400).json({ error: 'Portfolio name already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Delete portfolio
app.delete('/api/portfolios/:id', async (req, res) => {
    try {
        // Check if portfolio has projects
        const projects = await query('SELECT COUNT(*) as count FROM projects WHERE portfolio_id = ?', [req.params.id]);

        if (projects[0].count > 0) {
            res.status(400).json({
                error: 'Cannot delete portfolio with associated projects. Please reassign or delete the projects first.'
            });
            return;
        }

        const result = await query('DELETE FROM portfolios WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Portfolio not found' });
            return;
        }

        res.json({ message: 'Portfolio deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== PROJECTS API ====================

// Get all projects
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await query(`
            SELECT
                p.*,
                po.name as portfolio_name,
                po.color as portfolio_color
            FROM projects p
            LEFT JOIN portfolios po ON p.portfolio_id = po.id
            ORDER BY p.created_at DESC
        `);
        res.json({ projects });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get project statistics (must be before :id route to avoid route shadowing)
app.get('/api/projects/:id/statistics', async (req, res) => {
    try {
        const projectId = req.params.id;

        const results = await query(`
            SELECT
                COUNT(*) as totalTickets,
                SUM(CASE WHEN resolved_in_2days > 0 THEN 1 ELSE 0 END) as resolvedTickets,
                SUM(resolved_in_2days) as within2Days,
                SUM(total_tickets) as allTickets
            FROM analysis_records
            WHERE project_id = ?
        `, [projectId]);

        const row = results[0] || {};

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
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single project
app.get('/api/projects/:id', async (req, res) => {
    try {
        const projects = await query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
        if (projects.length === 0) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        res.json({ project: projects[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create project
app.post('/api/projects', async (req, res) => {
    try {
        const { name, description, portfolio_id } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Project name is required' });
            return;
        }

        // Verify portfolio exists if portfolio_id is provided
        if (portfolio_id) {
            const portfolios = await query('SELECT id FROM portfolios WHERE id = ?', [portfolio_id]);
            if (portfolios.length === 0) {
                res.status(400).json({ error: 'Portfolio not found' });
                return;
            }
        }

        const result = await query(
            'INSERT INTO projects (name, description, portfolio_id) VALUES (?, ?, ?)',
            [name, description, portfolio_id || null]
        );

        res.json({
            message: 'Project created successfully',
            project: {
                id: result.insertId,
                name,
                description,
                portfolio_id: portfolio_id || null
            }
        });
    } catch (error) {
        if (error.message.includes('Duplicate entry')) {
            res.status(400).json({ error: 'Project name already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
    try {
        const { name, description, portfolio_id } = req.body;

        // Verify portfolio exists if portfolio_id is provided
        if (portfolio_id) {
            const portfolios = await query('SELECT id FROM portfolios WHERE id = ?', [portfolio_id]);
            if (portfolios.length === 0) {
                res.status(400).json({ error: 'Portfolio not found' });
                return;
            }
        }

        const result = await query(
            'UPDATE projects SET name = ?, description = ?, portfolio_id = ? WHERE id = ?',
            [name, description, portfolio_id || null, req.params.id]
        );

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        res.json({ message: 'Project updated successfully' });
    } catch (error) {
        if (error.message.includes('Duplicate entry')) {
            res.status(400).json({ error: 'Project name already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
    try {
        const result = await query('DELETE FROM projects WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ANALYSIS RECORDS API ====================

// Get all analysis records
app.get('/api/records', async (req, res) => {
    try {
        const records = await query(`
            SELECT
                r.*,
                p.name as project_name
            FROM analysis_records r
            LEFT JOIN projects p ON r.project_id = p.id
            ORDER BY r.created_at DESC
        `);
        res.json({ records });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get aggregated data grouped by project, year, and quarter
app.get('/api/records/aggregated', async (req, res) => {
    try {
        const rows = await query(`
            SELECT
                r.*,
                p.name as project_name,
                p.id as project_id
            FROM analysis_records r
            LEFT JOIN projects p ON r.project_id = p.id
            ORDER BY p.name, r.year DESC, r.created_at DESC
        `);

        // Group by project, year, and quarter
        const aggregated = {};

        rows.forEach(record => {
            const projectKey = record.project_id || 'unassigned';
            const year = record.year;
            const months = safeJsonParse(record.months);

            // Determine quarters from months
            const quarters = new Set();

            months.forEach(month => {
                const quarter = getMonthQuarter(month);
                if (quarter) {
                    quarters.add(quarter);
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
                const analysisDataArray = safeJsonParse(record.analysis_data);

                // If analysis_data is an array, process each month's data
                if (Array.isArray(analysisDataArray)) {
                    analysisDataArray.forEach(monthInfo => {
                        const displayName = monthInfo.displayName || '';
                        const totalTickets = monthInfo.totalTickets || 0;
                        const resolvedIn2Days = monthInfo.resolvedIn2Days || 0;

                        // Use displayName as the key for monthly breakdown
                        if (!aggregated[projectKey].years[year].quarters[quarter].months[displayName]) {
                            aggregated[projectKey].years[year].quarters[quarter].months[displayName] = {
                                name: displayName,
                                total_tickets: 0,
                                resolved_in_2days: 0,
                                records: []
                            };
                        }

                        aggregated[projectKey].years[year].quarters[quarter].months[displayName].total_tickets += totalTickets;
                        aggregated[projectKey].years[year].quarters[quarter].months[displayName].resolved_in_2days += resolvedIn2Days;
                        aggregated[projectKey].years[year].quarters[quarter].months[displayName].records.push({
                            id: record.id,
                            filename: record.filename,
                            total_tickets: totalTickets,
                            resolved_in_2days: resolvedIn2Days
                        });
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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get records by project
app.get('/api/records/project/:projectId', async (req, res) => {
    try {
        const records = await query(`
            SELECT
                r.*,
                p.name as project_name
            FROM analysis_records r
            LEFT JOIN projects p ON r.project_id = p.id
            WHERE r.project_id = ?
            ORDER BY r.created_at DESC
        `, [req.params.projectId]);
        res.json({ records });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create analysis record
app.post('/api/records', async (req, res) => {
    try {
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

        const result = await query(
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
            ]
        );

        res.json({
            message: 'Record saved successfully',
            record: {
                id: result.insertId
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete analysis record
app.delete('/api/records/:id', async (req, res) => {
    try {
        const result = await query('DELETE FROM analysis_records WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Record not found' });
            return;
        }

        res.json({ message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete all records
app.delete('/api/records', async (req, res) => {
    try {
        const result = await query('DELETE FROM analysis_records');
        res.json({ message: 'All records deleted successfully', deleted: result.affectedRows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== STATISTICS API ====================

// Get statistics with flexible time period comparison
app.get('/api/statistics/compare', async (req, res) => {
    try {
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
        const rows = await query(`
            SELECT
                r.*,
                p.name as project_name
            FROM analysis_records r
            LEFT JOIN projects p ON r.project_id = p.id
            WHERE r.project_id = ?
            ORDER BY r.year DESC, r.created_at DESC
        `, [projectId]);

        // Transform records into monthly breakdown
        const allRecords = [];
        rows.forEach(row => {
            try {
                const analysisData = safeJsonParse(row.analysis_data);

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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== DASHBOARD API ====================

// Get dashboard statistics with filtering
app.get('/api/dashboard', async (req, res) => {
    try {
        const projectId = req.query.projectId;
        const period = req.query.period || 'all';

        let queryStr = `
            SELECT
                r.*,
                p.name as project_name
            FROM analysis_records r
            LEFT JOIN projects p ON r.project_id = p.id
        `;

        const params = [];

        // Filter by project if specified
        if (projectId && projectId !== 'all') {
            queryStr += ' WHERE r.project_id = ?';
            params.push(projectId);
        }

        queryStr += ' ORDER BY r.created_at DESC';

        const rows = await query(queryStr, params);

        // Transform records into the format expected by frontend
        const records = [];
        rows.forEach(row => {
            // Parse analysis_data to get monthly breakdown
            try {
                const analysisData = safeJsonParse(row.analysis_data);

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
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== PROJECT STATISTICS API ====================

// Helper function to convert month name to number
function getMonthNumber(month) {
    if (typeof month === 'number') return month;

    const monthMap = {
        'january': 1, 'jan': 1,
        'february': 2, 'feb': 2,
        'march': 3, 'mar': 3,
        'april': 4, 'apr': 4,
        'may': 5,
        'june': 6, 'jun': 6,
        'july': 7, 'jul': 7,
        'august': 8, 'aug': 8,
        'september': 9, 'sep': 9, 'sept': 9,
        'october': 10, 'oct': 10,
        'november': 11, 'nov': 11,
        'december': 12, 'dec': 12
    };

    const monthLower = String(month).toLowerCase().trim();

    // Try to find month in the string (e.g., "Apr 2025" or "April 2025")
    for (const [monthName, monthNumber] of Object.entries(monthMap)) {
        if (monthLower.startsWith(monthName)) {
            return monthNumber;
        }
    }

    return parseInt(month) || 0;
}

// Get comprehensive project statistics
app.get('/api/project-statistics/:projectId', async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

        const rows = await query(`
            SELECT
                r.*,
                p.name as project_name,
                p.description as project_description
            FROM analysis_records r
            LEFT JOIN projects p ON r.project_id = p.id
            WHERE r.project_id = ?
            ORDER BY r.year DESC, r.created_at DESC
        `, [projectId]);

        // Transform records into monthly breakdown
        const allRecords = [];
        const yearlyData = {};
        const quarterlyData = {};
        const monthlyData = {};

        rows.forEach(row => {
            try {
                const analysisData = safeJsonParse(row.analysis_data);

                if (Array.isArray(analysisData)) {
                    analysisData.forEach(monthData => {
                        // Use displayName to extract month number, fallback to month field
                        const monthNum = getMonthNumber(monthData.displayName || monthData.month);
                        const quarter = Math.ceil(monthNum / 3);
                        const quarterKey = `Q${quarter}`;
                        const recordYear = row.year;

                        const totalTickets = monthData.totalTickets || 0;
                        const resolvedIn2Days = monthData.resolvedIn2Days || 0;
                        const resolvedAfter2Days = monthData.resolvedAfter2Days || (totalTickets - resolvedIn2Days);

                        const record = {
                            id: row.id,
                            project_id: row.project_id,
                            project_name: row.project_name,
                            filename: row.filename,
                            created_at: row.created_at,
                            year: recordYear,
                            month: monthNum,
                            quarter: quarterKey,
                            displayName: monthData.displayName,
                            total_tickets: totalTickets,
                            resolved_in_2days: resolvedIn2Days,
                            resolved_after_2days: resolvedAfter2Days,
                            success_rate: parseFloat(monthData.percentage || monthData.successRate) || 0
                        };

                        allRecords.push(record);

                        // Aggregate by year
                        if (!yearlyData[recordYear]) {
                            yearlyData[recordYear] = {
                                year: recordYear,
                                total_tickets: 0,
                                resolved_in_2days: 0,
                                resolved_after_2days: 0,
                                success_rate: 0
                            };
                        }
                        yearlyData[recordYear].total_tickets += record.total_tickets;
                        yearlyData[recordYear].resolved_in_2days += record.resolved_in_2days;
                        yearlyData[recordYear].resolved_after_2days += record.resolved_after_2days;

                        // Aggregate by quarter
                        const qKey = `${recordYear}-${quarterKey}`;
                        if (!quarterlyData[qKey]) {
                            quarterlyData[qKey] = {
                                year: recordYear,
                                quarter: quarterKey,
                                total_tickets: 0,
                                resolved_in_2days: 0,
                                resolved_after_2days: 0,
                                success_rate: 0,
                                months: [],
                                records: []
                            };
                        }
                        quarterlyData[qKey].total_tickets += record.total_tickets;
                        quarterlyData[qKey].resolved_in_2days += record.resolved_in_2days;
                        quarterlyData[qKey].resolved_after_2days += record.resolved_after_2days;
                        quarterlyData[qKey].records.push(record);

                        // Aggregate by month
                        const mKey = `${recordYear}-${monthNum}`;
                        if (!monthlyData[mKey]) {
                            monthlyData[mKey] = {
                                year: recordYear,
                                month: monthNum,
                                displayName: monthData.displayName,
                                total_tickets: 0,
                                resolved_in_2days: 0,
                                resolved_after_2days: 0,
                                success_rate: 0
                            };
                        }
                        monthlyData[mKey].total_tickets += record.total_tickets;
                        monthlyData[mKey].resolved_in_2days += record.resolved_in_2days;
                        monthlyData[mKey].resolved_after_2days += record.resolved_after_2days;
                    });
                }
            } catch (e) {
                console.error('Error parsing analysis data:', e);
            }
        });

        // Calculate success rates
        Object.values(yearlyData).forEach(data => {
            if (data.total_tickets > 0) {
                data.success_rate = parseFloat(((data.resolved_in_2days / data.total_tickets) * 100).toFixed(2));
            }
        });

        Object.values(quarterlyData).forEach(data => {
            if (data.total_tickets > 0) {
                data.success_rate = parseFloat(((data.resolved_in_2days / data.total_tickets) * 100).toFixed(2));
            }
        });

        Object.values(monthlyData).forEach(data => {
            if (data.total_tickets > 0) {
                data.success_rate = parseFloat(((data.resolved_in_2days / data.total_tickets) * 100).toFixed(2));
            }
        });

        // Get current year data
        const currentYearData = yearlyData[year] || {
            year: year,
            total_tickets: 0,
            resolved_in_2days: 0,
            resolved_after_2days: 0,
            success_rate: 0
        };

        // Get current year months
        const currentMonths = Object.values(monthlyData)
            .filter(m => m.year === year)
            .sort((a, b) => a.month - b.month);

        // Get current year quarters and populate with nested months
        const currentQuarters = Object.values(quarterlyData)
            .filter(q => q.year === year)
            .sort((a, b) => {
                const qA = parseInt(a.quarter.substring(1));
                const qB = parseInt(b.quarter.substring(1));
                return qA - qB;
            })
            .map(quarter => {
                // Create months object keyed by displayName for this quarter
                const quarterMonths = {};
                currentMonths.forEach(month => {
                    // Check if month belongs to this quarter
                    const monthQuarter = Math.ceil(month.month / 3);
                    if (monthQuarter === parseInt(quarter.quarter.substring(1))) {
                        quarterMonths[month.displayName] = {
                            name: month.displayName,
                            total_tickets: month.total_tickets,
                            resolved_in_2days: month.resolved_in_2days,
                            resolved_after_2days: month.resolved_after_2days,
                            success_rate: month.success_rate,
                            month: month.month
                        };
                    }
                });
                return {
                    ...quarter,
                    months: quarterMonths
                };
            });

        // Convert quarters array to object indexed by quarter name for dashboard.html
        const quartersObject = {};
        currentQuarters.forEach(quarter => {
            quartersObject[quarter.quarter] = quarter;
        });

        res.json({
            success: true,
            project: rows.length > 0 ? {
                id: rows[0].project_id,
                name: rows[0].project_name,
                description: rows[0].project_description
            } : null,
            currentYear: {
                year: year,
                data: currentYearData,
                quarters: quartersObject,
                quartersArray: currentQuarters,
                months: currentMonths
            },
            allYears: Object.values(yearlyData).sort((a, b) => b.year - a.year),
            allQuarters: Object.values(quarterlyData).sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return parseInt(b.quarter.substring(1)) - parseInt(a.quarter.substring(1));
            }),
            allMonths: Object.values(monthlyData).sort((a, b) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            })
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Enhanced comparison endpoint for project statistics
app.get('/api/project-statistics/:projectId/compare', async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const comparisonType = req.query.type; // 'quarter', 'year', 'month'

        // Period 1 parameters
        const period1Year = req.query.period1Year ? parseInt(req.query.period1Year) : null;
        const period1Quarter = req.query.period1Quarter; // Q1, Q2, Q3, Q4
        const period1Month = req.query.period1Month ? parseInt(req.query.period1Month) : null;

        // Period 2 parameters
        const period2Year = req.query.period2Year ? parseInt(req.query.period2Year) : null;
        const period2Quarter = req.query.period2Quarter;
        const period2Month = req.query.period2Month ? parseInt(req.query.period2Month) : null;

        if (!projectId || !comparisonType) {
            return res.status(400).json({ error: 'Project ID and comparison type are required' });
        }

        const rows = await query(`
            SELECT
                r.*,
                p.name as project_name
            FROM analysis_records r
            LEFT JOIN projects p ON r.project_id = p.id
            WHERE r.project_id = ?
            ORDER BY r.year DESC, r.created_at DESC
        `, [projectId]);

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

        // Transform records into monthly breakdown
        const allRecords = [];
        rows.forEach(row => {
            try {
                const analysisData = safeJsonParse(row.analysis_data);
                if (Array.isArray(analysisData)) {
                    analysisData.forEach(monthData => {
                        const monthNum = getMonthNumber(monthData.month);
                        allRecords.push({
                            year: row.year,
                            month: monthNum,
                            quarter: `Q${Math.ceil(monthNum / 3)}`,
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

        // Filter records based on comparison type
        let period1Records = [];
        let period2Records = [];

        if (comparisonType === 'quarter') {
            const quarter1Months = getQuarterMonths(period1Quarter);
            const quarter2Months = getQuarterMonths(period2Quarter);

            period1Records = allRecords.filter(r =>
                r.year === period1Year && quarter1Months.includes(r.month)
            );
            period2Records = allRecords.filter(r =>
                r.year === period2Year && quarter2Months.includes(r.month)
            );
        } else if (comparisonType === 'year') {
            period1Records = allRecords.filter(r => r.year === period1Year);
            period2Records = allRecords.filter(r => r.year === period2Year);
        } else if (comparisonType === 'month') {
            period1Records = allRecords.filter(r =>
                r.year === period1Year && r.month === period1Month
            );
            period2Records = allRecords.filter(r =>
                r.year === period2Year && r.month === period2Month
            );
        }

        // Calculate statistics for each period
        const calculateStats = (records) => {
            const total_tickets = records.reduce((sum, r) => sum + r.total_tickets, 0);
            const resolved_in_2days = records.reduce((sum, r) => sum + r.resolved_in_2days, 0);
            const resolved_after_2days = records.reduce((sum, r) => sum + r.resolved_after_2days, 0);
            const success_rate = total_tickets > 0
                ? parseFloat(((resolved_in_2days / total_tickets) * 100).toFixed(2))
                : 0;

            return {
                total_tickets,
                resolved_in_2days,
                resolved_after_2days,
                success_rate,
                records: records.sort((a, b) => a.month - b.month)
            };
        };

        const period1Stats = calculateStats(period1Records);
        const period2Stats = calculateStats(period2Records);

        // Calculate differences
        const difference = {
            total_tickets: period1Stats.total_tickets - period2Stats.total_tickets,
            resolved_in_2days: period1Stats.resolved_in_2days - period2Stats.resolved_in_2days,
            resolved_after_2days: period1Stats.resolved_after_2days - period2Stats.resolved_after_2days,
            success_rate: period1Stats.success_rate - period2Stats.success_rate,
            total_tickets_percent: period2Stats.total_tickets > 0
                ? parseFloat((((period1Stats.total_tickets - period2Stats.total_tickets) / period2Stats.total_tickets) * 100).toFixed(2))
                : 0,
            resolved_in_2days_percent: period2Stats.resolved_in_2days > 0
                ? parseFloat((((period1Stats.resolved_in_2days - period2Stats.resolved_in_2days) / period2Stats.resolved_in_2days) * 100).toFixed(2))
                : 0
        };

        res.json({
            success: true,
            comparisonType,
            period1: {
                label: comparisonType === 'quarter' ? `${period1Year} ${period1Quarter}` :
                       comparisonType === 'year' ? `${period1Year}` :
                       `${period1Year} Month ${period1Month}`,
                ...period1Stats
            },
            period2: {
                label: comparisonType === 'quarter' ? `${period2Year} ${period2Quarter}` :
                       comparisonType === 'year' ? `${period2Year}` :
                       `${period2Year} Month ${period2Month}`,
                ...period2Stats
            },
            difference
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// ==================== PERFORMANCE STATISTICS API ====================

// Get all performance statistics
app.get('/api/performance-statistics', async (req, res) => {
    try {
        const records = await query(`
            SELECT
                ps.*,
                p.name as project_name
            FROM performance_statistics ps
            LEFT JOIN projects p ON ps.project_id = p.id
            ORDER BY ps.year DESC, ps.month, ps.created_at DESC
        `);
        res.json({ records });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get performance statistics by project
app.get('/api/performance-statistics/project/:id', async (req, res) => {
    try {
        const records = await query(`
            SELECT * FROM performance_statistics
            WHERE project_id = ?
            ORDER BY year DESC, month
        `, [req.params.id]);
        res.json({ records });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get aggregated performance statistics for dashboard
app.get('/api/performance-statistics/dashboard', async (req, res) => {
    try {
        const { projectId, year } = req.query;

        let sql = `
            SELECT
                ps.*,
                p.name as project_name
            FROM performance_statistics ps
            LEFT JOIN projects p ON ps.project_id = p.id
            WHERE 1=1
        `;
        const params = [];

        if (projectId) {
            sql += ' AND ps.project_id = ?';
            params.push(projectId);
        }

        if (year) {
            sql += ' AND ps.year = ?';
            params.push(year);
        }

        sql += ' ORDER BY ps.project_name, ps.year DESC, ps.month';

        const records = await query(sql, params);

        // Group by project and calculate quarterly averages
        const grouped = {};

        records.forEach(record => {
            const projectKey = record.project_id || 'unassigned';

            if (!grouped[projectKey]) {
                grouped[projectKey] = {
                    project_id: record.project_id,
                    project_name: record.project_name || 'Unassigned',
                    years: {}
                };
            }

            const recordYear = record.year;
            if (!grouped[projectKey].years[recordYear]) {
                grouped[projectKey].years[recordYear] = {
                    quarters: {
                        'Q1': { months: [], values: [], average: 0 },
                        'Q2': { months: [], values: [], average: 0 },
                        'Q3': { months: [], values: [], average: 0 },
                        'Q4': { months: [], values: [], average: 0 }
                    },
                    allMonths: []
                };
            }

            const quarter = record.quarter;
            grouped[projectKey].years[recordYear].quarters[quarter].months.push(record.month);
            grouped[projectKey].years[recordYear].quarters[quarter].values.push(record.value);
            grouped[projectKey].years[recordYear].allMonths.push({
                month: record.month,
                quarter: record.quarter,
                value: record.value
            });
        });

        // Calculate averages and sort months
        Object.keys(grouped).forEach(projectKey => {
            Object.keys(grouped[projectKey].years).forEach(year => {
                Object.keys(grouped[projectKey].years[year].quarters).forEach(quarter => {
                    const quarterData = grouped[projectKey].years[year].quarters[quarter];
                    if (quarterData.values.length > 0) {
                        // Create array of month-value pairs
                        const monthValuePairs = quarterData.months.map((month, index) => ({
                            month: month,
                            value: quarterData.values[index]
                        }));

                        // Sort by month order
                        const monthOrder = ['january', 'february', 'march', 'april', 'may', 'june',
                                          'july', 'august', 'september', 'october', 'november', 'december'];
                        monthValuePairs.sort((a, b) => {
                            return monthOrder.indexOf(a.month.toLowerCase()) - monthOrder.indexOf(b.month.toLowerCase());
                        });

                        // Separate back into months and values arrays
                        quarterData.months = monthValuePairs.map(pair => pair.month);
                        quarterData.values = monthValuePairs.map(pair => pair.value);

                        // Calculate average
                        const sum = quarterData.values.reduce((a, b) => a + b, 0);
                        quarterData.average = parseFloat((sum / quarterData.values.length).toFixed(2));
                        quarterData.count = quarterData.values.length;
                    }
                });
            });
        });

        res.json({ data: grouped });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get portfolio statistics - aggregated performance data by portfolio
app.get('/api/portfolio-statistics', async (req, res) => {
    try {
        // Get all portfolios
        const portfolios = await query(`
            SELECT
                p.*,
                COUNT(DISTINCT proj.id) as project_count
            FROM portfolios p
            LEFT JOIN projects proj ON p.id = proj.portfolio_id
            GROUP BY p.id
            ORDER BY p.name
        `);

        // Get all performance statistics with project and portfolio info
        const allStats = await query(`
            SELECT
                ps.*,
                proj.name as project_name,
                proj.portfolio_id
            FROM performance_statistics ps
            INNER JOIN projects proj ON ps.project_id = proj.id
            WHERE proj.portfolio_id IS NOT NULL
            ORDER BY proj.portfolio_id, ps.year DESC, ps.quarter, ps.month
        `);

        // Group statistics by portfolio
        const portfolioStats = {};

        portfolios.forEach(portfolio => {
            portfolioStats[portfolio.id] = {
                id: portfolio.id,
                name: portfolio.name,
                description: portfolio.description,
                project_count: portfolio.project_count,
                total_data_points: 0,
                years: {}
            };
        });

        // Aggregate statistics by portfolio
        allStats.forEach(record => {
            const portfolioId = record.portfolio_id;

            if (!portfolioStats[portfolioId]) return;

            portfolioStats[portfolioId].total_data_points++;

            const year = record.year;
            const quarter = record.quarter;
            const month = record.month.toLowerCase();

            // Initialize year if not exists
            if (!portfolioStats[portfolioId].years[year]) {
                portfolioStats[portfolioId].years[year] = {
                    quarters: {
                        'Q1': { months: {}, count: 0, sum: 0, average: 0 },
                        'Q2': { months: {}, count: 0, sum: 0, average: 0 },
                        'Q3': { months: {}, count: 0, sum: 0, average: 0 },
                        'Q4': { months: {}, count: 0, sum: 0, average: 0 }
                    }
                };
            }

            const quarterData = portfolioStats[portfolioId].years[year].quarters[quarter];

            // Initialize month if not exists
            if (!quarterData.months[month]) {
                quarterData.months[month] = {
                    sum: 0,
                    count: 0,
                    average: 0
                };
            }

            // Add value to month
            quarterData.months[month].sum += record.value;
            quarterData.months[month].count++;

            // Add to quarter totals
            quarterData.sum += record.value;
            quarterData.count++;
        });

        // Calculate averages
        Object.keys(portfolioStats).forEach(portfolioId => {
            const portfolio = portfolioStats[portfolioId];

            Object.keys(portfolio.years).forEach(year => {
                const yearData = portfolio.years[year];

                Object.keys(yearData.quarters).forEach(quarterKey => {
                    const quarter = yearData.quarters[quarterKey];

                    // Calculate month averages
                    Object.keys(quarter.months).forEach(month => {
                        const monthData = quarter.months[month];
                        if (monthData.count > 0) {
                            monthData.average = parseFloat((monthData.sum / monthData.count).toFixed(2));
                        }
                    });

                    // Calculate quarter average
                    if (quarter.count > 0) {
                        quarter.average = parseFloat((quarter.sum / quarter.count).toFixed(2));

                        // Convert months object to array for easier frontend rendering
                        quarter.months = Object.keys(quarter.months).map(month => ({
                            month: month,
                            average: quarter.months[month].average,
                            count: quarter.months[month].count
                        })).sort((a, b) => {
                            const monthOrder = ['january', 'february', 'march', 'april', 'may', 'june',
                                              'july', 'august', 'september', 'october', 'november', 'december'];
                            return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
                        });
                    } else {
                        quarter.months = [];
                    }
                });
            });
        });

        // Convert to array and filter out portfolios with no data
        const result = Object.values(portfolioStats).filter(p => p.total_data_points > 0);

        res.json({ portfolios: result });
    } catch (error) {
        console.error('Error fetching portfolio statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get performance statistics summary for a specific project
app.get('/api/projects/:id/performance-statistics', async (req, res) => {
    try {
        const projectId = req.params.id;

        const records = await query(`
            SELECT
                ps.*,
                p.name as project_name
            FROM performance_statistics ps
            LEFT JOIN projects p ON ps.project_id = p.id
            WHERE ps.project_id = ?
            ORDER BY ps.year DESC, ps.month
        `, [projectId]);

        if (records.length === 0) {
            return res.json({
                success: true,
                hasData: false,
                statistics: null
            });
        }

        // Group by year and quarter
        const years = {};
        let totalDataPoints = 0;
        let totalValue = 0;
        const latestYear = Math.max(...records.map(r => r.year));
        const latestQuarter = records.filter(r => r.year === latestYear)
            .reduce((latest, r) => {
                const qNum = parseInt(r.quarter.replace('Q', ''));
                const latestQNum = latest ? parseInt(latest.replace('Q', '')) : 0;
                return qNum > latestQNum ? r.quarter : latest;
            }, null);

        records.forEach(record => {
            const year = record.year;
            const quarter = record.quarter;

            if (!years[year]) {
                years[year] = {
                    quarters: {}
                };
            }

            if (!years[year].quarters[quarter]) {
                years[year].quarters[quarter] = {
                    months: [],
                    values: [],
                    average: 0,
                    count: 0
                };
            }

            years[year].quarters[quarter].months.push(record.month);
            years[year].quarters[quarter].values.push(record.value);
            years[year].quarters[quarter].count++;
            totalDataPoints++;
            totalValue += record.value;
        });

        // Calculate averages for each quarter
        Object.keys(years).forEach(year => {
            Object.keys(years[year].quarters).forEach(quarter => {
                const quarterData = years[year].quarters[quarter];
                if (quarterData.values.length > 0) {
                    const sum = quarterData.values.reduce((a, b) => a + b, 0);
                    quarterData.average = parseFloat((sum / quarterData.values.length).toFixed(2));
                }
            });
        });

        // Get latest quarter average
        const latestQuarterAverage = years[latestYear] && years[latestYear].quarters[latestQuarter]
            ? years[latestYear].quarters[latestQuarter].average
            : 0;

        const overallAverage = totalDataPoints > 0 ? parseFloat((totalValue / totalDataPoints).toFixed(2)) : 0;

        res.json({
            success: true,
            hasData: true,
            statistics: {
                totalDataPoints,
                overallAverage,
                latestYear,
                latestQuarter,
                latestQuarterAverage,
                years,
                allRecords: records.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Save performance statistics (bulk insert)
app.post('/api/performance-statistics', async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ error: 'Records array is required' });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const record of records) {
                const { project_id, project_name, year, quarter, month, value, filename } = record;

                await connection.execute(
                    `INSERT INTO performance_statistics
                    (project_id, project_name, year, quarter, month, value, filename)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [project_id, project_name, year, quarter, month, value, filename]
                );
            }

            await connection.commit();
            res.json({
                success: true,
                message: `${records.length} performance statistics saved successfully`
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete performance statistics by scope (project, year, quarter, month)
// NOTE: This route must come BEFORE the /:id route to avoid "delete" being interpreted as an id
app.delete('/api/performance-statistics/delete', async (req, res) => {
    try {
        const { scope, projectId, year, quarter, month } = req.query;

        if (!scope || !projectId) {
            return res.status(400).json({
                success: false,
                error: 'Scope and projectId are required'
            });
        }

        let sql = 'DELETE FROM performance_statistics WHERE project_id = ?';
        const params = [projectId];

        // Build WHERE clause based on scope
        if (scope === 'year' && year) {
            sql += ' AND year = ?';
            params.push(year);
        } else if (scope === 'quarter' && year && quarter) {
            sql += ' AND year = ? AND quarter = ?';
            params.push(year, quarter);
        } else if (scope === 'month' && year && quarter && month) {
            // Convert month name to lowercase for comparison
            sql += ' AND year = ? AND quarter = ? AND LOWER(month) = LOWER(?)';
            params.push(year, quarter, month);
        } else if (scope !== 'all') {
            return res.status(400).json({
                success: false,
                error: 'Invalid scope or missing required parameters'
            });
        }

        const result = await query(sql, params);

        if (result.affectedRows === 0) {
            return res.json({
                success: true,
                message: 'No records found to delete',
                deletedCount: 0
            });
        }

        res.json({
            success: true,
            message: `Successfully deleted ${result.affectedRows} record(s)`,
            deletedCount: result.affectedRows
        });
    } catch (error) {
        console.error('Error deleting performance statistics:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete performance statistic by ID
app.delete('/api/performance-statistics/:id', async (req, res) => {
    try {
        const result = await query('DELETE FROM performance_statistics WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Record not found' });
            return;
        }

        res.json({ message: 'Performance statistic deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete all performance statistics
app.delete('/api/performance-statistics', async (req, res) => {
    try {
        const result = await query('DELETE FROM performance_statistics');
        res.json({
            message: 'All performance statistics deleted successfully',
            deletedCount: result.affectedRows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== PROJECT AVAILABILITY ENDPOINTS ====================

// Get all project availability data
app.get('/api/project-availability', async (req, res) => {
    try {
        const data = await query(`
            SELECT pa.*, p.name as project_name
            FROM project_availability pa
            LEFT JOIN projects p ON pa.project_id = p.id
            ORDER BY pa.year DESC, pa.quarter, pa.month
        `);
        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get project availability by project
app.get('/api/project-availability/project/:id', async (req, res) => {
    try {
        const data = await query(
            `SELECT * FROM project_availability
            WHERE project_id = ?
            ORDER BY year DESC, quarter, month`,
            [req.params.id]
        );
        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get project availability summary for a specific project
app.get('/api/projects/:id/project-availability', async (req, res) => {
    try {
        const projectId = req.params.id;

        const data = await query(`
            SELECT *
            FROM project_availability pa
            WHERE pa.project_id = ?
            ORDER BY pa.year DESC, pa.quarter, pa.month
        `, [projectId]);

        if (data.length === 0) {
            return res.json({ success: true, hasData: false, statistics: null });
        }

        // Process data to calculate statistics
        const totalDataPoints = data.length;
        const overallAverage = data.reduce((sum, item) => sum + parseFloat(item.value), 0) / totalDataPoints;

        // Get latest data point
        const latestData = data[0];
        const latestYear = latestData.year;
        const latestQuarter = latestData.quarter;
        const latestQuarterData = data.filter(d => d.year === latestYear && d.quarter === latestQuarter);
        const latestQuarterAverage = latestQuarterData.reduce((sum, item) => sum + parseFloat(item.value), 0) / latestQuarterData.length;

        // Group by year and quarter
        const years = {};
        data.forEach(item => {
            const year = item.year;
            const quarter = item.quarter;
            const month = item.month;

            if (!years[year]) {
                years[year] = { quarters: {} };
            }

            if (!years[year].quarters[quarter]) {
                years[year].quarters[quarter] = {
                    values: [],
                    months: [],
                    count: 0,
                    average: 0
                };
            }

            years[year].quarters[quarter].values.push(parseFloat(item.value));
            years[year].quarters[quarter].months.push(month);
            years[year].quarters[quarter].count++;
        });

        // Calculate quarterly averages
        Object.keys(years).forEach(year => {
            Object.keys(years[year].quarters).forEach(quarter => {
                const quarterData = years[year].quarters[quarter];
                quarterData.average = quarterData.values.reduce((sum, val) => sum + val, 0) / quarterData.count;
            });
        });

        res.json({
            success: true,
            hasData: true,
            statistics: {
                totalDataPoints,
                overallAverage: parseFloat(overallAverage.toFixed(2)),
                latestYear,
                latestQuarter,
                latestQuarterAverage: parseFloat(latestQuarterAverage.toFixed(2)),
                years
            }
        });
    } catch (error) {
        console.error('Error getting project availability:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Save project availability (bulk insert)
app.post('/api/project-availability', async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ error: 'Records array is required' });
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const record of records) {
                const { project_id, project_name, year, quarter, month, value, filename } = record;

                await connection.execute(
                    `INSERT INTO project_availability
                    (project_id, project_name, year, quarter, month, value, filename)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [project_id, project_name, year, quarter, month, value, filename]
                );
            }

            await connection.commit();
            res.json({
                success: true,
                message: `${records.length} project availability records saved successfully`
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete project availability by scope (project, year, quarter, month)
app.delete('/api/project-availability/delete', async (req, res) => {
    try {
        const { scope, projectId, year, quarter, month } = req.query;

        if (!scope || !projectId) {
            return res.status(400).json({ error: 'Scope and project ID are required' });
        }

        let sql = 'DELETE FROM project_availability WHERE project_id = ?';
        let params = [projectId];

        if (scope === 'year' && year) {
            sql += ' AND year = ?';
            params.push(year);
        } else if (scope === 'quarter' && year && quarter) {
            sql += ' AND year = ? AND quarter = ?';
            params.push(year, quarter);
        } else if (scope === 'month' && year && quarter && month) {
            sql += ' AND year = ? AND quarter = ? AND month = ?';
            params.push(year, quarter, month);
        }

        const result = await query(sql, params);

        res.json({
            success: true,
            message: `Deleted ${result.affectedRows} record(s)`,
            deletedCount: result.affectedRows
        });
    } catch (error) {
        console.error('Error deleting project availability:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete project availability by ID
app.delete('/api/project-availability/:id', async (req, res) => {
    try {
        const result = await query('DELETE FROM project_availability WHERE id = ?', [req.params.id]);

        if (result.affectedRows === 0) {
            res.status(404).json({ error: 'Record not found' });
            return;
        }

        res.json({ message: 'Project availability record deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete all project availability records
app.delete('/api/project-availability', async (req, res) => {
    try {
        const result = await query('DELETE FROM project_availability');
        res.json({
            message: 'All project availability records deleted successfully',
            deletedCount: result.affectedRows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== SERVE HTML PAGES ====================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'ticket-analyzer.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'settings.html'));
});

app.get('/portfolios', (req, res) => {
    res.sendFile(path.join(__dirname, 'portfolios.html'));
});

app.get('/projects', (req, res) => {
    res.sendFile(path.join(__dirname, 'projects.html'));
});

app.get('/statistics', (req, res) => {
    res.sendFile(path.join(__dirname, 'statistics.html'));
});

app.get('/project-statistics', (req, res) => {
    res.sendFile(path.join(__dirname, 'project-statistics.html'));
});

app.get('/performance-statistics', (req, res) => {
    res.sendFile(path.join(__dirname, 'performance-statistics.html'));
});

app.get('/project-availability', (req, res) => {
    res.sendFile(path.join(__dirname, 'project-availability.html'));
});

app.get('/project-availability-results', (req, res) => {
    res.sendFile(path.join(__dirname, 'project-availability-results.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`Projects: http://localhost:${PORT}/projects`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    try {
        if (pool) {
            await pool.end();
        }
        console.log('\nDatabase connection closed');
        process.exit(0);
    } catch (err) {
        console.error('Error closing database:', err);
        process.exit(1);
    }
});
