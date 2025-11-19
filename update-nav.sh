#!/bin/bash

# Navigation bar template with dropdown
NAV_TEMPLATE='            <div class="navbar-links">
                <a href="/dashboard.html" class="nav-btn"><i class="fas fa-chart-bar"></i> Dashboard</a>
                <div class="nav-dropdown">
                    <button class="nav-btn"><i class="fas fa-chart-line"></i> Analyzers <i class="fas fa-chevron-down"></i></button>
                    <div class="nav-dropdown-content">
                        <a href="/"><i class="fas fa-file-alt"></i> Ticket Analyzer</a>
                        <a href="/performance-statistics"><i class="fas fa-trophy"></i> Performance Statistics</a>
                    </div>
                </div>
                <a href="/settings" class="nav-btn"><i class="fas fa-cog"></i> Settings</a>
                <a href="/project-statistics.html" class="nav-btn"><i class="fas fa-chart-pie"></i> Project Statistics</a>
            </div>'

# CSS for dropdown
DROPDOWN_CSS='        .nav-dropdown {
            position: relative;
            display: inline-block;
        }

        .nav-dropdown-content {
            display: none;
            position: absolute;
            background-color: white;
            min-width: 220px;
            box-shadow: var(--shadow-xl);
            border-radius: var(--radius-lg);
            z-index: 1000;
            top: 100%;
            margin-top: 0.5rem;
            border: 1px solid var(--gray-200);
        }

        .nav-dropdown-content a {
            color: var(--gray-700);
            padding: 0.875rem 1.25rem;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            transition: all 0.2s ease;
            font-weight: 500;
        }

        .nav-dropdown-content a:first-child {
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        }

        .nav-dropdown-content a:last-child {
            border-radius: 0 0 var(--radius-lg) var(--radius-lg);
        }

        .nav-dropdown-content a:hover {
            background-color: var(--gray-100);
            color: var(--primary);
            transform: translateX(4px);
        }

        .nav-dropdown:hover .nav-dropdown-content {
            display: block;
        }

        .nav-dropdown .nav-btn {
            cursor: pointer;
        }'

echo "Navigation update script created"
echo "Run this script to update all navigation bars"
