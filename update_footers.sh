#!/bin/bash

# New footer HTML content
NEW_FOOTER='    <!-- Footer -->
    <footer>
        <div class="footer-container">
            <div class="footer-top">
                <!-- Brand Column -->
                <div class="footer-column brand-column">
                    <div class="footer-logo">
                        <img src="src/logo/main_logo.png" alt="QA Analytics Logo">
                    </div>
                    <p class="footer-description">
                        Comprehensive quality assurance analytics and reporting dashboard for Takamol Holding.
                    </p>
                </div>

                <!-- Analyzer Column -->
                <div class="footer-column">
                    <h3>Analyzer</h3>
                    <ul class="footer-links">
                        <li><a href="/dashboard.html"><i class="fas fa-chart-bar"></i> Ticket Analysis</a></li>
                        <li><a href="/"><i class="fas fa-file-alt"></i> Ticket Analyzer</a></li>
                    </ul>
                </div>

                <!-- Statistics Column -->
                <div class="footer-column">
                    <h3>Statistics</h3>
                    <ul class="footer-links">
                        <li><a href="/performance-statistics"><i class="fas fa-trophy"></i> Performance Stats</a></li>
                        <li><a href="/project-statistics.html"><i class="fas fa-project-diagram"></i> Project Stats</a></li>
                        <li><a href="/portfolio-statistics.html"><i class="fas fa-briefcase"></i> Portfolio Stats</a></li>
                    </ul>
                </div>

                <!-- Availability Column -->
                <div class="footer-column">
                    <h3>Availability</h3>
                    <ul class="footer-links">
                        <li><a href="/availability-statistics"><i class="fas fa-chart-area"></i> Availability Stats</a></li>
                        <li><a href="/project-availability"><i class="fas fa-project-diagram"></i> Availability Projects</a></li>
                        <li><a href="/availability-dashboard"><i class="fas fa-briefcase"></i> Availability Portfolios</a></li>
                    </ul>
                </div>

                <!-- Settings Column -->
                <div class="footer-column">
                    <h3>General</h3>
                    <ul class="footer-links">
                        <li><a href="/settings"><i class="fas fa-cog"></i> Settings</a></li>
                    </ul>
                </div>
            </div>

            <div class="footer-bottom">
                <div class="footer-copyright">
                    <i class="fas fa-copyright"></i> <span id="year"></span> All Rights Reserved
                </div>
                <div class="footer-divider"></div>
                <div class="footer-developer">
                    <i class="fas fa-user-tie"></i> Developed by: <strong>Haitham Al Mughrabi</strong>
                </div>
                <div class="footer-divider"></div>
                <div class="footer-company">
                    <div class="footer-company-header">
                        <i class="fas fa-building"></i> <span class="footer-company-name">Takamol Holding</span>
                    </div>
                    <div class="footer-department"><i class="fas fa-check-circle"></i> Integrated Solutions | Quality Assurance Unit</div>
                </div>
            </div>
        </div>
    </footer>'

# List of HTML files to update (excluding dashboard.html and settings.html which are already done)
FILES=(
    "ticket-analyzer.html"
    "performance-statistics.html"
    "availability-statistics.html"
    "project-statistics.html"
    "portfolio-statistics.html"
    "availability-dashboard.html"
    "project-availability.html"
    "projects.html"
    "portfolios.html"
    "statistics.html"
)

# Update each file
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Updating $file..."
        # Use perl for multi-line replacement
        perl -i -0777 -pe 's/    <!-- Footer -->\s*<footer>.*?<\/footer>/'"$NEW_FOOTER"'/s' "$file"
        echo "✓ Updated $file"
    else
        echo "✗ File not found: $file"
    fi
done

echo "Footer update complete!"
