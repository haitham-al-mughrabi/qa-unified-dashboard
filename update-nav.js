const fs = require('fs');
const path = require('path');

const NEW_NAV = `    <!-- Navigation -->
    <nav class="navbar">
        <div class="navbar-container-redesigned">
            <!-- Logo/Icon on the left -->
            <a href="/dashboard.html" class="navbar-brand-left">
                <div class="navbar-brand-icon"><i class="fas fa-line-chart"></i></div>
                <span class="navbar-brand-text">QA Analytics</span>
            </a>

            <!-- Main Navigation Links -->
            <div class="navbar-links-main">
                <a href="/dashboard.html" class="nav-btn"><i class="fas fa-chart-bar"></i> Dashboard</a>
                <a href="/" class="nav-btn"><i class="fas fa-file-alt"></i> Ticket Analyzer</a>

                <!-- Statistics Dropdown -->
                <div class="nav-dropdown">
                    <button class="nav-btn dropdown-toggle">
                        <i class="fas fa-chart-line"></i> Statistics <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="dropdown-menu">
                        <a href="/performance-statistics" class="dropdown-item">
                            <i class="fas fa-trophy"></i> Performance Statistics
                        </a>
                        <a href="/availability-statistics" class="dropdown-item">
                            <i class="fas fa-server"></i> Availability Statistics
                        </a>
                        <div class="dropdown-divider"></div>
                        <a href="/project-statistics.html" class="dropdown-item">
                            <i class="fas fa-project-diagram"></i> Project Details
                        </a>
                        <a href="/portfolio-statistics.html" class="dropdown-item">
                            <i class="fas fa-briefcase"></i> Portfolio Details
                        </a>
                        <a href="/project-availability" class="dropdown-item">
                            <i class="fas fa-server"></i> Availability Projects
                        </a>
                        <a href="/availability-dashboard" class="dropdown-item">
                            <i class="fas fa-briefcase"></i> Availability Portfolios
                        </a>
                    </div>
                </div>

                <a href="/projects" class="nav-btn"><i class="fas fa-folder-open"></i> Projects</a>
                <a href="/portfolios" class="nav-btn"><i class="fas fa-briefcase"></i> Portfolios</a>
                <a href="/settings" class="nav-btn"><i class="fas fa-cog"></i> Settings</a>
            </div>
        </div>
    </nav>`;

// CSS link to add
const NAVBAR_CSS_LINK = '    <link rel="stylesheet" href="/src/static/navbar.css">';

// ... (files list) ...

files.forEach(filename => {
    const filepath = path.join(__dirname, filename);

    if (!fs.existsSync(filepath)) {
        console.log(`Skipping ${filename} - file not found`);
        return;
    }

    let content = fs.readFileSync(filepath, 'utf8');

    // Replace old navigation
    content = content.replace(
        /<nav class="navbar">[\s\S]*?<\/nav>/,
        NEW_NAV
    );

    // Add navbar.css link if not present
    if (!content.includes('/src/static/navbar.css')) {
        // Find the last link tag or the end of head
        const headEndIndex = content.indexOf('</head>');
        if (headEndIndex !== -1) {
            // Try to insert after the last CSS link
            const lastLinkIndex = content.lastIndexOf('<link rel="stylesheet"');
            if (lastLinkIndex !== -1) {
                const endOfLink = content.indexOf('>', lastLinkIndex) + 1;
                content = content.slice(0, endOfLink) + '\n' + NAVBAR_CSS_LINK + content.slice(endOfLink);
            } else {
                // Insert before </head>
                content = content.slice(0, headEndIndex) + NAVBAR_CSS_LINK + '\n' + content.slice(headEndIndex);
            }
        }
    }

    // Add dropdown script if not present
    if (!content.includes('Dropdown functionality')) {
        const bodyEndIndex = content.lastIndexOf('</body>');
        if (bodyEndIndex !== -1) {
            content = content.slice(0, bodyEndIndex) + DROPDOWN_SCRIPT + '\n' + content.slice(bodyEndIndex);
        }
    }

    fs.writeFileSync(filepath, content, 'utf8');
    console.log(`✓ Updated ${filename}`);
});

console.log('\nAll files updated successfully!');
