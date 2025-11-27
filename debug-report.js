// Debug Report Functionality
let debugData = null;

function toggleDebugReport() {
    const content = document.getElementById('debugContent');
    const btn = document.querySelector('.btn-toggle-debug');
    
    if (content.style.display === 'none' || !content.style.display) {
        content.style.display = 'block';
        btn.textContent = 'Hide Details';
    } else {
        content.style.display = 'none';
        btn.textContent = 'Show Details';
    }
}

function getConfidenceClass(confidence) {
    if (confidence >= 80) return 'confidence-high';
    if (confidence >= 50) return 'confidence-medium';
    return 'confidence-low';
}

function getConfidenceLabel(confidence) {
    if (confidence >= 80) return 'High';
    if (confidence >= 50) return 'Medium';
    return 'Low';
}

function renderDebugReport(metrics, metadata) {
    debugData = { metrics, metadata };
    
    const successCount = metadata.successful_extractions || 0;
    const totalImages = metadata.image_count || 0;
    const processingTime = metadata.estimated_time_seconds || 0;
    
    const debugHTML = `
        <div class="debug-report-section">
            <div class="debug-header">
                <h3>📊 Extraction Debug Report</h3>
                <button class="btn-toggle-debug" onclick="toggleDebugReport()">Show Details</button>
            </div>
            
            <div class="debug-content" id="debugContent" style="display: none;">
                <!-- Processing Summary -->
                <div class="debug-summary-card">
                    <h4>Processing Summary</h4>
                    <div class="debug-stats-grid">
                        <div class="debug-stat">
                            <i class="fas fa-images"></i>
                            <span class="stat-value">${totalImages}</span>
                            <span class="stat-label">Images Processed</span>
                        </div>
                        <div class="debug-stat">
                            <i class="fas fa-check-circle"></i>
                            <span class="stat-value">${successCount}</span>
                            <span class="stat-label">Successful Extractions</span>
                        </div>
                        <div class="debug-stat">
                            <i class="fas fa-clock"></i>
                            <span class="stat-value">${processingTime}s</span>
                            <span class="stat-label">Processing Time</span>
                        </div>
                    </div>
                </div>
                
                <!-- Detailed Metrics List -->
                <div class="debug-metrics-list">
                    ${metrics.map((metric, idx) => renderMetricDebugCard(metric, idx)).join('')}
                </div>
            </div>
        </div>
    `;
    
    return debugHTML;
}

function renderMetricDebugCard(metric, idx) {
    const debug = metric.debug || {};
    const hasValue = metric.value !== null && metric.value !== undefined;
    const valueClass = hasValue ? 'value-success' : 'value-failure';
    const displayValue = hasValue ? metric.value : 'FAILED';
    
    // Images
    const originalImage = debug.original_image 
        ? `<img src="data:image/png;base64,${debug.original_image}" class="debug-image" alt="Original Image">` 
        : '<div class="no-image">No image available</div>';
        
    const processedImage = debug.processed_image 
        ? `<img src="data:image/png;base64,${debug.processed_image}" class="debug-image" alt="Processed Image">` 
        : '<div class="no-image">No image available</div>';

    // Candidates Table
    const candidates = debug.candidates || [];
    const candidatesRows = candidates.map(c => {
        const isSelected = c.value === metric.value;
        const rowClass = isSelected ? 'candidate-row selected' : 'candidate-row';
        return `
            <tr class="${rowClass}">
                <td>${c.value}</td>
                <td>"${c.text}"</td>
                <td>${c.score ? c.score.toFixed(0) : 'N/A'}</td>
                <td>${c.area ? c.area.toFixed(0) : 'N/A'}</td>
                <td>${c.conf ? c.conf.toFixed(1) + '%' : 'N/A'}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="metric-debug-card">
            <div class="metric-debug-header">
                <div class="metric-title">#${idx + 1} ${metric.title || 'Untitled'}</div>
                <div class="metric-value-badge ${valueClass}">${displayValue}</div>
            </div>
            
            <div class="debug-images-grid">
                <div class="debug-image-container">
                    <h5>Original Image</h5>
                    ${originalImage}
                </div>
                <div class="debug-image-container">
                    <h5>Processed for OCR</h5>
                    ${processedImage}
                </div>
            </div>
            
            <div class="selection-reason">
                <strong>🏆 Selection Reason:</strong> ${debug.selection_reason || 'N/A'}
            </div>
            
            <div class="candidates-section">
                <h5>🔢 Top Candidates</h5>
                <table class="candidates-table">
                    <thead>
                        <tr>
                            <th>Value</th>
                            <th>Detected Text</th>
                            <th>Score</th>
                            <th>Area</th>
                            <th>Conf</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${candidatesRows.length > 0 ? candidatesRows : '<tr><td colspan="5">No candidates found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
