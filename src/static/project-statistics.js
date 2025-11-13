const API_URL = 'http://localhost:3000/api';

let selectedProject = null;
let allProjects = [];
let currentYearData = null;
let availableYears = [];
let currentComparisonData = null;

// Chart instances
let yearResolutionChartInstance = null;
let yearMetricsChartInstance = null;
let quarterlyTrendChartInstance = null;
let quarterlySuccessChartInstance = null;
let monthlyChartInstance = null;
let comparisonBarChartInstance = null;
let comparisonSuccessChartInstance = null;
let overlaidChartInstance = null;

// ===================  UTILITY FUNCTIONS ===================

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

async function fetchJSON(url, options = {}) {
    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } else {
                    const text = await response.text();
                    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
                        errorMessage = `Server returned HTML error page (${response.status}). The API endpoint may not exist or the server encountered an error.`;
                    } else {
                        errorMessage = text || errorMessage;
                    }
                }
            } catch (e) {
                // Use default message
            }
            throw new Error(errorMessage);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
                throw new Error('Server returned HTML instead of JSON. The API endpoint may not exist or the server is not running.');
            }
            throw new Error('Server did not return JSON. Received content-type: ' + (contentType || 'unknown'));
        }

        return await response.json();
    } catch (error) {
        if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
            throw new Error('Cannot connect to API server. Please ensure the server is running at ' + API_URL);
        }
        throw error;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =================== PROJECT MANAGEMENT ===================

async function loadProjects() {
    try {
        const data = await fetchJSON(`${API_URL}/projects`);
        allProjects = data.projects || [];

        if (allProjects.length === 0) {
            document.getElementById('projectsGrid').innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-2xl);">
                    <i class="fas fa-folder-open" style="font-size: 3rem; color: var(--gray-400); margin-bottom: var(--spacing-lg);"></i>
                    <h3 style="color: var(--gray-600); margin-bottom: var(--spacing-sm);">No Projects Found</h3>
                    <p style="color: var(--gray-500);">Please create a project first to view statistics.</p>
                    <a href="/projects.html" class="btn-filter" style="margin-top: var(--spacing-lg); display: inline-flex; text-decoration: none;">
                        <i class="fas fa-plus"></i> Create Project
                    </a>
                </div>
            `;
            return;
        }

        loadProjectsModal();
    } catch (error) {
        console.error('Error loading projects:', error);
        document.getElementById('projectsGrid').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-2xl); color: var(--danger);">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: var(--spacing-lg);"></i>
                <h3>Error Loading Projects</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function loadProjectsModal() {
    const projectsGrid = document.getElementById('projectsGrid');
    let html = '';

    allProjects.forEach(project => {
        html += `
            <div class="project-card-modal" onclick="selectProject(${project.id}, '${escapeHtml(project.name)}', '${escapeHtml(project.description || '')}')">
                <div class="project-card-header">
                    <i class="fas fa-folder"></i>
                </div>
                <h3>${escapeHtml(project.name)}</h3>
                <p>${escapeHtml(project.description || 'No description')}</p>
                <div class="project-meta">
                    <span><i class="fas fa-calendar"></i> ${new Date(project.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        `;
    });

    projectsGrid.innerHTML = html;
}

async function selectProject(projectId, projectName, projectDescription) {
    selectedProject = {
        id: projectId,
        name: projectName,
        description: projectDescription
    };

    // Update UI
    document.getElementById('heroTitle').textContent = `${projectName} - Statistics`;
    document.getElementById('heroSubtitle').textContent = `Comprehensive analytics and performance comparison for ${projectName}`;
    document.getElementById('selectedProjectName').textContent = projectName;
    document.getElementById('selectedProjectDescription').textContent = projectDescription || 'No description available';
    document.getElementById('selectedProjectInfo').style.display = 'block';
    document.getElementById('mainTabs').style.display = 'block';

    // Close modal
    closeProjectModal();
    document.getElementById('closeModalBtn').style.display = 'flex';

    // Load available years
    await loadAvailableYears(projectId);
}

async function loadAvailableYears(projectId) {
    try {
        showLoading();
        const data = await fetchJSON(`${API_URL}/records/project/${projectId}`);

        const yearsSet = new Set();
        data.records.forEach(record => {
            yearsSet.add(record.year);
        });

        availableYears = Array.from(yearsSet).sort((a, b) => b - a);

        // Populate all year selects
        const yearSelects = ['yearSelect', 'q1Year', 'q2Year', 'y1Year', 'y2Year', 'm1Year', 'm2Year'];
        yearSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            select.innerHTML = selectId === 'yearSelect' ? '<option value="">Select Year...</option>' : '';

            availableYears.forEach(year => {
                select.innerHTML += `<option value="${year}">${year}</option>`;
            });
        });

        // Set default to current year if available
        const currentYear = new Date().getFullYear();
        if (availableYears.includes(currentYear)) {
            document.getElementById('yearSelect').value = currentYear;
            loadYearData();
        } else if (availableYears.length > 0) {
            document.getElementById('yearSelect').value = availableYears[0];
            loadYearData();
        }
    } catch (error) {
        console.error('Error loading available years:', error);
        alert('Error loading years: ' + error.message);
    } finally {
        hideLoading();
    }
}

function openProjectModal() {
    document.getElementById('projectModal').style.display = 'flex';
}

function closeProjectModal() {
    if (selectedProject) {
        document.getElementById('projectModal').style.display = 'none';
    }
}

// =================== TAB MANAGEMENT ===================

function switchMainTab(tabName) {
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    event.target.closest('.tab-btn').classList.add('active');

    // Update tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));

    if (tabName === 'overview') {
        document.getElementById('overviewTab').classList.add('active');
    } else if (tabName === 'compare') {
        document.getElementById('compareTab').classList.add('active');
    }
}

function switchComparisonType(type) {
    // Update buttons
    const buttons = document.querySelectorAll('.comparison-type-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.closest('.comparison-type-btn').classList.add('active');

    // Update sections
    const sections = document.querySelectorAll('.compare-section');
    sections.forEach(section => section.classList.remove('active'));

    if (type === 'quarter') {
        document.getElementById('quarterCompareSection').classList.add('active');
    } else if (type === 'year') {
        document.getElementById('yearCompareSection').classList.add('active');
    } else if (type === 'month') {
        document.getElementById('monthCompareSection').classList.add('active');
    }

    // Hide comparison results when switching types
    document.getElementById('comparisonResults').style.display = 'none';
}

function switchVisualization(vizType) {
    // Update buttons
    const buttons = document.querySelectorAll('.viz-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.closest('.viz-btn').classList.add('active');

    // Update visualization sections
    const sections = document.querySelectorAll('.viz-section');
    sections.forEach(section => section.classList.remove('active'));

    if (vizType === 'side-by-side') {
        document.getElementById('sideBySideViz').classList.add('active');
    } else if (vizType === 'overlaid') {
        document.getElementById('overlaidViz').classList.add('active');
    } else if (vizType === 'table') {
        document.getElementById('tableViz').classList.add('active');
    }
}

// =================== OVERVIEW TAB FUNCTIONS ===================

async function loadYearData() {
    const year = document.getElementById('yearSelect').value;

    if (!year || !selectedProject) {
        return;
    }

    try {
        showLoading();
        const data = await fetchJSON(`${API_URL}/project-statistics/${selectedProject.id}?year=${year}`);

        if (data.success) {
            currentYearData = data.currentYear;
            updateOverviewDisplay(data.currentYear);
            document.getElementById('overviewStatsContent').style.display = 'block';
        } else {
            alert('Error loading year data');
        }
    } catch (error) {
        console.error('Error loading year data:', error);
        alert('Error loading year data: ' + error.message);
    } finally {
        hideLoading();
    }
}

function updateOverviewDisplay(yearData) {
    const { year, data, quarters, months } = yearData;

    // Update year label
    document.getElementById('currentYearLabel').textContent = year;

    // Update year stats cards
    document.getElementById('yearTotalTickets').textContent = data.total_tickets;
    document.getElementById('yearResolvedIn2Days').textContent = data.resolved_in_2days;
    document.getElementById('yearResolvedAfter2Days').textContent = data.resolved_after_2days;
    document.getElementById('yearSuccessRate').textContent = data.success_rate.toFixed(2) + '%';

    // Update year charts
    updateYearCharts(data);

    // Update quarterly breakdown
    updateQuarterlyDisplay(quarters);

    // Update monthly breakdown
    updateMonthlyDisplay(months);
}

function updateYearCharts(data) {
    // Resolution Pie Chart
    const resCtx = document.getElementById('yearResolutionChart').getContext('2d');
    if (yearResolutionChartInstance) yearResolutionChartInstance.destroy();

    yearResolutionChartInstance = new Chart(resCtx, {
        type: 'doughnut',
        data: {
            labels: ['Resolved in 2 Days', 'Resolved After 2 Days'],
            datasets: [{
                data: [data.resolved_in_2days, data.resolved_after_2days],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                ],
                borderColor: [
                    'rgb(16, 185, 129)',
                    'rgb(245, 158, 11)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12, weight: 600 },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            }
        }
    });

    // Metrics Bar Chart
    const metCtx = document.getElementById('yearMetricsChart').getContext('2d');
    if (yearMetricsChartInstance) yearMetricsChartInstance.destroy();

    yearMetricsChartInstance = new Chart(metCtx, {
        type: 'bar',
        data: {
            labels: ['Total Tickets', 'Resolved in 2 Days', 'Resolved After 2 Days'],
            datasets: [{
                label: 'Count',
                data: [data.total_tickets, data.resolved_in_2days, data.resolved_after_2days],
                backgroundColor: [
                    'rgba(79, 70, 229, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                ],
                borderColor: [
                    'rgb(79, 70, 229)',
                    'rgb(16, 185, 129)',
                    'rgb(245, 158, 11)'
                ],
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                }
            }
        }
    });
}

function updateQuarterlyDisplay(quarters) {
    // Update quarterly cards
    const quarterlyGrid = document.getElementById('quarterlyCardsGrid');
    let html = '';

    if (quarters.length === 0) {
        html = '<div style="grid-column: 1 / -1; text-align: center; color: var(--gray-500); padding: var(--spacing-2xl);">No quarterly data available</div>';
    } else {
        quarters.forEach(q => {
            html += `
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-calendar-week"></i></div>
                    <div class="stat-content">
                        <h3>${q.quarter}</h3>
                        <div style="font-size: 0.875rem; color: var(--gray-600); margin-top: 0.5rem;">
                            <div><strong>${q.total_tickets}</strong> tickets</div>
                            <div><strong>${q.resolved_in_2days}</strong> resolved in 2 days</div>
                            <div><strong>${q.success_rate.toFixed(2)}%</strong> success rate</div>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    quarterlyGrid.innerHTML = html;

    // Update quarterly charts
    if (quarters.length > 0) {
        updateQuarterlyCharts(quarters);
    }
}

function updateQuarterlyCharts(quarters) {
    // Quarterly Trend Line Chart
    const trendCtx = document.getElementById('quarterlyTrendChart').getContext('2d');
    if (quarterlyTrendChartInstance) quarterlyTrendChartInstance.destroy();

    quarterlyTrendChartInstance = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: quarters.map(q => q.quarter),
            datasets: [
                {
                    label: 'Total Tickets',
                    data: quarters.map(q => q.total_tickets),
                    borderColor: 'rgb(79, 70, 229)',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(79, 70, 229)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                },
                {
                    label: 'Resolved in 2 Days',
                    data: quarters.map(q => q.resolved_in_2days),
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(16, 185, 129)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        font: { size: 12, weight: 600 },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                }
            }
        }
    });

    // Quarterly Success Rate Area Chart
    const successCtx = document.getElementById('quarterlySuccessChart').getContext('2d');
    if (quarterlySuccessChartInstance) quarterlySuccessChartInstance.destroy();

    quarterlySuccessChartInstance = new Chart(successCtx, {
        type: 'line',
        data: {
            labels: quarters.map(q => q.quarter),
            datasets: [{
                label: 'Success Rate (%)',
                data: quarters.map(q => q.success_rate),
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: 'rgb(16, 185, 129)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        font: { size: 12, weight: 600 },
                        padding: 15
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

function updateMonthlyDisplay(months) {
    // Update monthly chart
    if (months.length > 0) {
        updateMonthlyChart(months);
    }

    // Update monthly table
    const tableBody = document.getElementById('monthlyTableBody');
    let html = '';

    if (months.length === 0) {
        html = `
            <tr>
                <td colspan="5" style="text-align: center; padding: var(--spacing-lg); color: var(--gray-500);">
                    No monthly data available
                </td>
            </tr>
        `;
    } else {
        months.forEach(m => {
            html += `
                <tr>
                    <td class="project-name-cell">
                        <div class="project-name-content">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${m.displayName || `Month ${m.month}`}</span>
                        </div>
                    </td>
                    <td class="stats-value-cell">${m.total_tickets}</td>
                    <td class="stats-value-cell">
                        <span class="badge badge-success">${m.resolved_in_2days}</span>
                    </td>
                    <td class="stats-value-cell">
                        <span class="badge badge-info">${m.resolved_after_2days}</span>
                    </td>
                    <td class="stats-value-cell">
                        <span class="percentage">${m.success_rate.toFixed(2)}%</span>
                    </td>
                </tr>
            `;
        });
    }

    tableBody.innerHTML = html;
}

function updateMonthlyChart(months) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    if (monthlyChartInstance) monthlyChartInstance.destroy();

    monthlyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.map(m => m.displayName || `Month ${m.month}`),
            datasets: [
                {
                    label: 'Total Tickets',
                    data: months.map(m => m.total_tickets),
                    borderColor: 'rgb(79, 70, 229)',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(79, 70, 229)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                },
                {
                    label: 'Resolved in 2 Days',
                    data: months.map(m => m.resolved_in_2days),
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(16, 185, 129)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        font: { size: 12, weight: 600 },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                }
            }
        }
    });
}

// =================== COMPARISON FUNCTIONS ===================

async function compareQuarters() {
    const q1Year = document.getElementById('q1Year').value;
    const q1Quarter = document.getElementById('q1Quarter').value;
    const q2Year = document.getElementById('q2Year').value;
    const q2Quarter = document.getElementById('q2Quarter').value;

    if (!q1Year || !q1Quarter || !q2Year || !q2Quarter) {
        alert('Please select both quarters to compare');
        return;
    }

    if (!selectedProject) {
        alert('Please select a project first');
        return;
    }

    try {
        showLoading();
        const url = `${API_URL}/project-statistics/${selectedProject.id}/compare?type=quarter&period1Year=${q1Year}&period1Quarter=${q1Quarter}&period2Year=${q2Year}&period2Quarter=${q2Quarter}`;
        const data = await fetchJSON(url);

        if (data.success) {
            currentComparisonData = data;
            displayComparisonResults(data);
        } else {
            alert('Error loading comparison data');
        }
    } catch (error) {
        console.error('Error comparing quarters:', error);
        alert('Error comparing quarters: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function compareYears() {
    const y1Year = document.getElementById('y1Year').value;
    const y2Year = document.getElementById('y2Year').value;

    if (!y1Year || !y2Year) {
        alert('Please select both years to compare');
        return;
    }

    if (!selectedProject) {
        alert('Please select a project first');
        return;
    }

    try {
        showLoading();
        const url = `${API_URL}/project-statistics/${selectedProject.id}/compare?type=year&period1Year=${y1Year}&period2Year=${y2Year}`;
        const data = await fetchJSON(url);

        if (data.success) {
            currentComparisonData = data;
            displayComparisonResults(data);
        } else {
            alert('Error loading comparison data');
        }
    } catch (error) {
        console.error('Error comparing years:', error);
        alert('Error comparing years: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function compareMonths() {
    const m1Year = document.getElementById('m1Year').value;
    const m1Month = document.getElementById('m1Month').value;
    const m2Year = document.getElementById('m2Year').value;
    const m2Month = document.getElementById('m2Month').value;

    if (!m1Year || !m1Month || !m2Year || !m2Month) {
        alert('Please select both months to compare');
        return;
    }

    if (!selectedProject) {
        alert('Please select a project first');
        return;
    }

    try {
        showLoading();
        const url = `${API_URL}/project-statistics/${selectedProject.id}/compare?type=month&period1Year=${m1Year}&period1Month=${m1Month}&period2Year=${m2Year}&period2Month=${m2Month}`;
        const data = await fetchJSON(url);

        if (data.success) {
            currentComparisonData = data;
            displayComparisonResults(data);
        } else {
            alert('Error loading comparison data');
        }
    } catch (error) {
        console.error('Error comparing months:', error);
        alert('Error comparing months: ' + error.message);
    } finally {
        hideLoading();
    }
}

function displayComparisonResults(data) {
    const { period1, period2, difference } = data;

    // Update labels
    document.getElementById('period1Label').textContent = period1.label;
    document.getElementById('period2Label').textContent = period2.label;

    // Update stats cards
    document.getElementById('p1TotalTickets').textContent = period1.total_tickets;
    document.getElementById('p1ResolvedIn2Days').textContent = period1.resolved_in_2days;
    document.getElementById('p1SuccessRate').textContent = period1.success_rate.toFixed(2) + '%';

    document.getElementById('p2TotalTickets').textContent = period2.total_tickets;
    document.getElementById('p2ResolvedIn2Days').textContent = period2.resolved_in_2days;
    document.getElementById('p2SuccessRate').textContent = period2.success_rate.toFixed(2) + '%';

    // Update table headers
    document.getElementById('tableP1Header').textContent = period1.label;
    document.getElementById('tableP2Header').textContent = period2.label;

    // Show comparison results
    document.getElementById('comparisonResults').style.display = 'block';

    // Update all visualizations
    updateSideBySideCharts(period1, period2);
    updateOverlaidChart(period1, period2);
    updateComparisonTable(period1, period2, difference);

    // Scroll to results
    document.getElementById('comparisonResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateSideBySideCharts(period1, period2) {
    // Comparison Bar Chart
    const barCtx = document.getElementById('comparisonBarChart').getContext('2d');
    if (comparisonBarChartInstance) comparisonBarChartInstance.destroy();

    comparisonBarChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: ['Total Tickets', 'Resolved in 2 Days', 'Resolved After 2 Days'],
            datasets: [
                {
                    label: period1.label,
                    data: [period1.total_tickets, period1.resolved_in_2days, period1.resolved_after_2days],
                    backgroundColor: 'rgba(79, 70, 229, 0.8)',
                    borderColor: 'rgb(79, 70, 229)',
                    borderWidth: 2,
                    borderRadius: 6
                },
                {
                    label: period2.label,
                    data: [period2.total_tickets, period2.resolved_in_2days, period2.resolved_after_2days],
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 2,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 12, weight: 600 },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                }
            }
        }
    });

    // Success Rate Comparison Chart
    const successCtx = document.getElementById('comparisonSuccessChart').getContext('2d');
    if (comparisonSuccessChartInstance) comparisonSuccessChartInstance.destroy();

    comparisonSuccessChartInstance = new Chart(successCtx, {
        type: 'bar',
        data: {
            labels: [period1.label, period2.label],
            datasets: [{
                label: 'Success Rate (%)',
                data: [period1.success_rate, period2.success_rate],
                backgroundColor: [
                    'rgba(79, 70, 229, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgb(79, 70, 229)',
                    'rgb(16, 185, 129)'
                ],
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

function updateOverlaidChart(period1, period2) {
    const ctx = document.getElementById('overlaidChart').getContext('2d');
    if (overlaidChartInstance) overlaidChartInstance.destroy();

    // Create month-by-month data if available
    const labels = ['Total Tickets', 'Resolved in 2 Days', 'Resolved After 2 Days', 'Success Rate (%)'];

    overlaidChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: period1.label,
                    data: [period1.total_tickets, period1.resolved_in_2days, period1.resolved_after_2days, period1.success_rate],
                    borderColor: 'rgb(79, 70, 229)',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(79, 70, 229)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                },
                {
                    label: period2.label,
                    data: [period2.total_tickets, period2.resolved_in_2days, period2.resolved_after_2days, period2.success_rate],
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(16, 185, 129)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { size: 12, weight: 600 },
                        padding: 15,
                        usePointStyle: true
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                }
            }
        }
    });
}

function updateComparisonTable(period1, period2, difference) {
    const tableBody = document.getElementById('comparisonTableBody');

    const metrics = [
        {
            name: 'Total Tickets',
            p1: period1.total_tickets,
            p2: period2.total_tickets,
            diff: difference.total_tickets,
            percent: difference.total_tickets_percent
        },
        {
            name: 'Resolved in 2 Days',
            p1: period1.resolved_in_2days,
            p2: period2.resolved_in_2days,
            diff: difference.resolved_in_2days,
            percent: difference.resolved_in_2days_percent
        },
        {
            name: 'Resolved After 2 Days',
            p1: period1.resolved_after_2days,
            p2: period2.resolved_after_2days,
            diff: difference.resolved_after_2days,
            percent: '-'
        },
        {
            name: 'Success Rate (%)',
            p1: period1.success_rate.toFixed(2) + '%',
            p2: period2.success_rate.toFixed(2) + '%',
            diff: difference.success_rate.toFixed(2),
            percent: '-'
        }
    ];

    let html = '';
    metrics.forEach(metric => {
        const diffClass = metric.diff > 0 ? 'positive' : (metric.diff < 0 ? 'negative' : '');
        const diffIcon = metric.diff > 0 ? '↑' : (metric.diff < 0 ? '↓' : '=');

        html += `
            <tr>
                <td style="font-weight: 600;">${metric.name}</td>
                <td class="stats-value-cell">${metric.p1}</td>
                <td class="stats-value-cell">${metric.p2}</td>
                <td class="stats-value-cell ${diffClass}" style="font-weight: 600;">
                    ${diffIcon} ${Math.abs(metric.diff)}
                </td>
                <td class="stats-value-cell ${diffClass}" style="font-weight: 600;">
                    ${metric.percent !== '-' ? (metric.percent > 0 ? '+' : '') + metric.percent + '%' : '-'}
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

// =================== EXPORT FUNCTIONS ===================

function exportOverviewReport() {
    if (!currentYearData || !selectedProject) {
        alert('Please load year data first');
        return;
    }

    const year = currentYearData.year;
    const data = currentYearData.data;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Project Statistics Report - Overview\n';
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
    csvContent += `Project,${selectedProject.name}\n`;
    csvContent += `Year,${year}\n\n`;

    csvContent += 'YEAR SUMMARY\n';
    csvContent += `Total Tickets,${data.total_tickets}\n`;
    csvContent += `Resolved in 2 Days,${data.resolved_in_2days}\n`;
    csvContent += `Resolved After 2 Days,${data.resolved_after_2days}\n`;
    csvContent += `Success Rate,${data.success_rate.toFixed(2)}%\n\n`;

    csvContent += 'QUARTERLY BREAKDOWN\n';
    csvContent += 'Quarter,Total Tickets,Resolved in 2 Days,Resolved After 2 Days,Success Rate\n';
    currentYearData.quarters.forEach(q => {
        csvContent += `${q.quarter},${q.total_tickets},${q.resolved_in_2days},${q.resolved_after_2days},${q.success_rate.toFixed(2)}%\n`;
    });

    csvContent += '\nMONTHLY BREAKDOWN\n';
    csvContent += 'Month,Total Tickets,Resolved in 2 Days,Resolved After 2 Days,Success Rate\n';
    currentYearData.months.forEach(m => {
        csvContent += `${m.displayName || 'Month ' + m.month},${m.total_tickets},${m.resolved_in_2days},${m.resolved_after_2days},${m.success_rate.toFixed(2)}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedProject.name}_overview_${year}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('Report exported successfully!');
}

function exportComparisonReport() {
    if (!currentComparisonData || !selectedProject) {
        alert('Please run a comparison first');
        return;
    }

    const { period1, period2, difference, comparisonType } = currentComparisonData;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Project Statistics Report - Comparison\n';
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;
    csvContent += `Project,${selectedProject.name}\n`;
    csvContent += `Comparison Type,${comparisonType}\n`;
    csvContent += `Period 1,${period1.label}\n`;
    csvContent += `Period 2,${period2.label}\n\n`;

    csvContent += 'COMPARISON RESULTS\n';
    csvContent += 'Metric,Period 1,Period 2,Difference,% Change\n';
    csvContent += `Total Tickets,${period1.total_tickets},${period2.total_tickets},${difference.total_tickets},${difference.total_tickets_percent}%\n`;
    csvContent += `Resolved in 2 Days,${period1.resolved_in_2days},${period2.resolved_in_2days},${difference.resolved_in_2days},${difference.resolved_in_2days_percent}%\n`;
    csvContent += `Resolved After 2 Days,${period1.resolved_after_2days},${period2.resolved_after_2days},${difference.resolved_after_2days},-\n`;
    csvContent += `Success Rate,${period1.success_rate.toFixed(2)}%,${period2.success_rate.toFixed(2)}%,${difference.success_rate.toFixed(2)}%,-\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedProject.name}_comparison_${comparisonType}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('Comparison report exported successfully!');
}

// =================== INITIALIZATION ===================

document.getElementById('year').textContent = new Date().getFullYear();

window.addEventListener('load', () => {
    loadProjects();
});

window.onclick = function(event) {
    const modal = document.getElementById('projectModal');
    if (event.target === modal && selectedProject) {
        closeProjectModal();
    }
}
