const mysql = require('mysql2/promise');

// Database configuration (must match Docker compose environment variables)
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'qa_user',
    password: process.env.DB_PASSWORD || 'qa_password',
    database: process.env.DB_NAME || 'qa_dashboard'
};

let pool;

// Initialize connection pool
async function initializePool() {
    pool = mysql.createPool(dbConfig);
    console.log('Connected to MySQL database');
}

// Project configurations
const projects = [
    { name: 'Customer Support', description: 'Customer support ticket analysis' },
    { name: 'Technical Support', description: 'Technical issue tracking and resolution' },
    { name: 'Sales Team', description: 'Sales inquiry and follow-up tracking' },
    { name: 'Product Bugs', description: 'Product bug reports and fixes' },
    { name: 'Feature Requests', description: 'Customer feature request tracking' }
];

// Month names
const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Quarter mapping
const quarterMonths = {
    'Q1': ['January', 'February', 'March'],
    'Q2': ['April', 'May', 'June'],
    'Q3': ['July', 'August', 'September'],
    'Q4': ['October', 'November', 'December']
};

// Helper function to get random int between min and max
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to get random success rate
function getRandomSuccessRate() {
    // Bias towards higher success rates (60-95%)
    const rand = Math.random();
    if (rand < 0.6) return getRandomInt(80, 95); // 60% chance of high success
    if (rand < 0.9) return getRandomInt(60, 79); // 30% chance of medium success
    return getRandomInt(40, 59); // 10% chance of low success
}

// Helper function to randomly skip some months in a quarter
function getRandomMonthsForQuarter(quarter) {
    const allMonths = quarterMonths[quarter];
    const numMonths = getRandomInt(1, 3); // Skip some months randomly

    // Shuffle and pick random months
    const shuffled = [...allMonths].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numMonths).sort((a, b) => {
        return monthNames.indexOf(a) - monthNames.indexOf(b);
    });
}

// Generate random analysis data for months
function generateAnalysisData(months, year) {
    return months.map(month => {
        const totalTickets = getRandomInt(100, 1000);
        const successRate = getRandomSuccessRate();
        const resolvedIn2Days = Math.floor((totalTickets * successRate) / 100);

        return {
            displayName: `${month} ${year}`,
            month: month,
            totalTickets: totalTickets,
            resolvedIn2Days: resolvedIn2Days,
            resolvedAfter2Days: totalTickets - resolvedIn2Days,
            successRate: successRate.toFixed(2)
        };
    });
}

// Clear existing data
async function clearData() {
    const connection = await pool.getConnection();
    try {
        await connection.execute('DELETE FROM analysis_records');
        await connection.execute('DELETE FROM projects');
        console.log('Cleared existing data');
    } finally {
        connection.release();
    }
}

// Insert projects
async function insertProjects() {
    const connection = await pool.getConnection();
    try {
        const projectIds = [];

        for (const project of projects) {
            const [result] = await connection.execute(
                'INSERT INTO projects (name, description) VALUES (?, ?)',
                [project.name, project.description]
            );
            projectIds.push(result.insertId);
        }

        console.log(`Created ${projects.length} projects`);
        return projectIds;
    } finally {
        connection.release();
    }
}

// Generate records for a project
async function generateRecordsForProject(projectId, projectName, startYear, endYear) {
    const connection = await pool.getConnection();
    try {
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

        // Randomly decide which years to cover for this project
        const yearsToGenerate = [];
        for (let year = startYear; year <= endYear; year++) {
            // 50% chance to include this year
            if (Math.random() < 0.5) {
                yearsToGenerate.push(year);
            }
        }

        // If no years selected, add at least 2-4 years
        if (yearsToGenerate.length === 0) {
            const numYears = getRandomInt(2, 4);
            for (let i = 0; i < numYears; i++) {
                const year = getRandomInt(startYear, endYear);
                if (!yearsToGenerate.includes(year)) {
                    yearsToGenerate.push(year);
                }
            }
            yearsToGenerate.sort();
        }

        // Generate quarters to create
        const quartersToGenerate = [];
        yearsToGenerate.forEach(year => {
            quarters.forEach(quarter => {
                // 75% chance to include this quarter
                if (Math.random() < 0.75) {
                    quartersToGenerate.push({ year, quarter });
                }
            });
        });

        if (quartersToGenerate.length === 0) {
            return;
        }

        // Generate records
        let recordsCreated = 0;
        for (const { year, quarter } of quartersToGenerate) {
            const months = getRandomMonthsForQuarter(quarter);
            const analysisData = generateAnalysisData(months, year);

            const totalTickets = analysisData.reduce((sum, m) => sum + m.totalTickets, 0);
            const resolvedIn2Days = analysisData.reduce((sum, m) => sum + m.resolvedIn2Days, 0);
            const successRate = ((resolvedIn2Days / totalTickets) * 100).toFixed(2);

            const filename = `${projectName}_${year}_${quarter}_Report.xlsx`;

            await connection.execute(
                `INSERT INTO analysis_records
                (project_id, filename, year, months, total_tickets, resolved_in_2days, success_rate, analysis_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    projectId,
                    filename,
                    year,
                    JSON.stringify(months),
                    totalTickets,
                    resolvedIn2Days,
                    successRate,
                    JSON.stringify(analysisData)
                ]
            );
            recordsCreated++;
        }

        console.log(`  - Created ${recordsCreated} records for ${projectName}`);
    } finally {
        connection.release();
    }
}

// Main execution
async function generateTestData() {
    console.log('Starting test data generation...\n');

    try {
        // Initialize database connection
        await initializePool();

        // Clear existing data
        await clearData();

        // Insert projects
        const projectIds = await insertProjects();
        console.log('');

        // Generate records for each project
        console.log('Generating analysis records...');
        for (let i = 0; i < projectIds.length; i++) {
            await generateRecordsForProject(projectIds[i], projects[i].name, 2019, 2030);
        }

        console.log('\n✓ Test data generation completed successfully!');
        console.log('\nSummary:');
        console.log(`  - Projects: ${projects.length}`);
        console.log(`  - Year range: 2019-2030`);
        console.log(`  - Random quarters and months generated per project`);
        console.log('\nYou can now view the dashboard at http://localhost:3000/dashboard');

    } catch (error) {
        console.error('Error generating test data:', error);
    } finally {
        if (pool) {
            await pool.end();
        }
        process.exit(0);
    }
}

// Run the generator
generateTestData();
