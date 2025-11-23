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

const NAV_STYLES = `
        /* Redesigned Navigation Styles */
        .navbar-container-redesigned {
            max-width: 1400px;
            margin: 0 auto;
            padding: var(--spacing-md) var(--spacing-xl);
            display: flex;
            align-items: center;
            gap: var(--spacing-xl);
        }

        .navbar-brand-left {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            text-decoration: none;
            padding: var(--spacing-sm) var(--spacing-md);
            background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
            border-radius: var(--radius-xl);
            border: 2px solid rgba(79, 70, 229, 0.2);
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(79, 70, 229, 0.15);
        }

        .navbar-brand-left:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
            border-color: var(--primary);
        }

        .navbar-brand-left .navbar-brand-icon {
            width: 45px;
            height: 45px;
            background: linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%);
            border-radius: var(--radius-lg);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
            box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
        }

        .navbar-brand-text {
            font-size: 1.25rem;
            font-weight: 800;
            background: linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .navbar-links-main {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            flex: 1;
        }

        .navbar-links-main .nav-btn {
            padding: 0.75rem 1.25rem;
            background: rgba(255, 255, 255, 0.7);
            color: var(--gray-700);
            border: 2px solid transparent;
            border-radius: var(--radius-full);
            cursor: pointer;
            font-size: 0.9375rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            white-space: nowrap;
        }

        .navbar-links-main .nav-btn:hover {
            background: white;
            color: var(--primary);
            border-color: var(--primary);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
        }

        .navbar-links-main .nav-btn.active {
            background: linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%);
            color: white;
            border-color: var(--primary);
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .nav-dropdown {
            position: relative;
        }

        .dropdown-toggle {
            background: rgba(255, 255, 255, 0.7) !important;
        }

        .dropdown-toggle:hover {
            background: white !important;
        }

        .dropdown-menu {
            position: absolute;
            top: calc(100% + 0.5rem);
            left: 0;
            min-width: 260px;
            background: white;
            border-radius: var(--radius-xl);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            padding: var(--spacing-sm);
            display: none;
            z-index: 1000;
            border: 2px solid var(--gray-100);
        }

        .nav-dropdown.active .dropdown-menu {
            display: block;
            animation: dropdownFadeIn 0.2s ease;
        }

        @keyframes dropdownFadeIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .dropdown-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            padding: var(--spacing-md) var(--spacing-lg);
            color: var(--gray-700);
            text-decoration: none;
            border-radius: var(--radius-lg);
            transition: all 0.2s ease;
            font-size: 0.9375rem;
            font-weight: 600;
        }

        .dropdown-item:hover {
            background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
            color: var(--primary);
            transform: translateX(4px);
        }

        .dropdown-item.active {
            background: linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
            color: var(--primary);
            font-weight: 700;
        }

        .dropdown-item i {
            width: 20px;
            text-align: center;
        }

        .dropdown-divider {
            height: 1px;
            background: var(--gray-200);
            margin: var(--spacing-sm) 0;
        }

        @media (max-width: 1024px) {
            .navbar-container-redesigned {
                flex-direction: column;
                gap: var(--spacing-md);
            }

            .navbar-links-main {
                flex-wrap: wrap;
                justify-content: center;
            }

            .navbar-brand-text {
                display: none;
            }
        }

        @media (max-width: 768px) {
            .navbar-links-main .nav-btn span:not(.fas) {
                display: none;
            }

            .navbar-links-main .nav-btn {
                padding: 0.75rem;
                min-width: 44px;
                justify-content: center;
            }

            .dropdown-toggle .fa-chevron-down {
                display: none;
            }
        }`;

const DROPDOWN_SCRIPT = `
    <script>
        // Dropdown functionality
        document.addEventListener('DOMContentLoaded', function() {
            const dropdowns = document.querySelectorAll('.nav-dropdown');

            dropdowns.forEach(dropdown => {
                const toggle = dropdown.querySelector('.dropdown-toggle');

                toggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    // Close other dropdowns
                    dropdowns.forEach(d => {
                        if (d !== dropdown) {
                            d.classList.remove('active');
                        }
                    });

                    // Toggle current dropdown
                    dropdown.classList.toggle('active');
                });
            });

            // Close dropdowns when clicking outside
            document.addEventListener('click', function() {
                dropdowns.forEach(dropdown => {
                    dropdown.classList.remove('active');
                });
            });

            // Prevent dropdown from closing when clicking inside it
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            });
        });
    </script>`;

// Files to update (excluding dashboard.html and availability-dashboard.html which are already done)
const files = [
    'ticket-analyzer.html',
    'performance-statistics.html',
    'availability-statistics.html',
    'project-statistics.html',
    'portfolio-statistics.html',
    'project-availability.html',
    'projects.html',
    'portfolios.html',
    'settings.html',
    'statistics.html'
];

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

    // Add nav styles if not present
    if (!content.includes('navbar-container-redesigned')) {
        // Find the last </style> tag and add styles before it
        const styleEndIndex = content.lastIndexOf('</style>');
        if (styleEndIndex !== -1) {
            content = content.slice(0, styleEndIndex) + NAV_STYLES + '\n' + content.slice(styleEndIndex);
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
