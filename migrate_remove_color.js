const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./qa_dashboard.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to database');
});

// Remove color column from projects table
db.serialize(() => {
    console.log('Starting migration to remove color column...');
    
    // SQLite doesn't support DROP COLUMN directly, so we need to:
    // 1. Create new table without color column
    // 2. Copy data
    // 3. Drop old table
    // 4. Rename new table
    
    db.run(`
        CREATE TABLE IF NOT EXISTS projects_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating new table:', err);
            return;
        }
        console.log('Created new projects table');
        
        // Copy data from old table to new table
        db.run(`
            INSERT INTO projects_new (id, name, description, created_at)
            SELECT id, name, description, created_at FROM projects
        `, (err) => {
            if (err) {
                console.error('Error copying data:', err);
                return;
            }
            console.log('Copied data to new table');
            
            // Drop old table
            db.run('DROP TABLE projects', (err) => {
                if (err) {
                    console.error('Error dropping old table:', err);
                    return;
                }
                console.log('Dropped old projects table');
                
                // Rename new table
                db.run('ALTER TABLE projects_new RENAME TO projects', (err) => {
                    if (err) {
                        console.error('Error renaming table:', err);
                        return;
                    }
                    console.log('✅ Migration completed successfully!');
                    console.log('Color column has been removed from projects table');
                    
                    db.close();
                });
            });
        });
    });
});
