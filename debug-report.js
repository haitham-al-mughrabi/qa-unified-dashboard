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
                
                <!-- Detailed Metrics Table -->
                <div class="debug-metrics-table">
                    <h4>Detailed Extraction Data</h4>
                    <table class="debug-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Metric Title</th>
                                <th>Value</th>
                                <th>Confidence</th>
                                <th>Raw OCR Text</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${metrics.map((metric, idx) => {
                                const debug = metric.debug || {};
                                const confidence = debug.confidence || 0;
                                const confidenceClass = getConfidenceClass(confidence);
                                const confidenceLabel = getConfidenceLabel(confidence);
                                const hasValue = metric.value !== null && metric.value !== undefined;
                                
                                return `
                                    <tr>
                                        <td><strong>${idx + 1}</strong></td>
                                        <td>${metric.title || 'Untitled'}</td>
                                        <td><strong>${hasValue ? metric.value : 'N/A'}</strong></td>
                                        <td>
                                            <span class="confidence-badge ${confidenceClass}">
                                                ${confidenceLabel} (${confidence.toFixed(1)}%)
                                            </span>
                                        </td>
                                        <td>
                                            <div class="raw-text-preview" title="${debug.raw_text || 'No OCR text'}">
                                                ${debug.raw_text || 'No OCR text'}
                                            </div>
                                        </td>
                                        <td>
                                            <i class="fas ${hasValue ? 'fa-check-circle status-success' : 'fa-times-circle status-failed'} status-icon"></i>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    return debugHTML;
}
