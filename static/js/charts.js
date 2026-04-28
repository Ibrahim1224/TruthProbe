/**
 * charts.js — Chart.js renderers for TruthProbe
 */
const CHART_COLORS = ['#667eea','#764ba2','#e84393','#38ef7d','#fdcb6e','#e17055','#0984e3'];
const chartInstances = {};
function destroyChart(id) { if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }

function renderLengthChart(canvasId, data) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels: data.map(d => d.demographic), datasets: [{ label: 'Words', data: data.map(d => d.response_length), backgroundColor: CHART_COLORS.slice(0, data.length).map(c => c + '99'), borderColor: CHART_COLORS.slice(0, data.length), borderWidth: 2, borderRadius: 8 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#6b6b8a' }, grid: { color: 'rgba(102,126,234,0.07)' } }, y: { ticks: { color: '#6b6b8a' }, grid: { color: 'rgba(102,126,234,0.07)' } } }, animation: { duration: 1200, easing: 'easeOutQuart' } }
    });
}

function renderSentimentChart(canvasId, data) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels: data.map(d => d.demographic), datasets: [{ label: 'Sentiment', data: data.map(d => d.sentiment), backgroundColor: data.map(d => d.sentiment > 0.1 ? '#38ef7d99' : d.sentiment < -0.1 ? '#ff416c99' : '#fdcb6e99'), borderColor: data.map(d => d.sentiment > 0.1 ? '#38ef7d' : d.sentiment < -0.1 ? '#ff416c' : '#fdcb6e'), borderWidth: 2, borderRadius: 8 }] },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#6b6b8a' }, grid: { color: 'rgba(102,126,234,0.07)' } }, y: { min: -1, max: 1, ticks: { color: '#6b6b8a' }, grid: { color: 'rgba(102,126,234,0.07)' } } }, animation: { duration: 1200 } }
    });
}

function renderEncDiscChart(canvasId, data) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: { labels: data.map(d => d.demographic), datasets: [{ label: 'Encouragement', data: data.map(d => d.encouragement), backgroundColor: '#38ef7d80', borderColor: '#38ef7d', borderWidth: 2, borderRadius: 8 }, { label: 'Discouragement', data: data.map(d => d.discouragement), backgroundColor: '#ff416c80', borderColor: '#ff416c', borderWidth: 2, borderRadius: 8 }] },
        options: { responsive: true, plugins: { legend: { labels: { color: '#9d9dbc' } } }, scales: { x: { ticks: { color: '#6b6b8a' }, grid: { color: 'rgba(102,126,234,0.07)' } }, y: { ticks: { color: '#6b6b8a' }, grid: { color: 'rgba(102,126,234,0.07)' } } }, animation: { duration: 1200 } }
    });
}

function renderRadarChart(canvasId, data) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const maxLen = Math.max(...data.map(d => d.response_length)) || 1;
    const maxEnc = Math.max(...data.map(d => d.encouragement)) || 1;
    const maxDisc = Math.max(...data.map(d => d.discouragement)) || 1;
    const datasets = data.map((d, i) => ({ label: d.demographic, data: [(d.response_length / maxLen) * 10, ((d.sentiment + 1) / 2) * 10, (d.encouragement / maxEnc) * 10, (d.discouragement / maxDisc) * 10], borderColor: CHART_COLORS[i % CHART_COLORS.length], backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '20', borderWidth: 2, pointRadius: 4, pointBackgroundColor: CHART_COLORS[i % CHART_COLORS.length] }));
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'radar',
        data: { labels: ['Length', 'Sentiment', 'Encouragement', 'Discouragement'], datasets },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#9d9dbc', font: { size: 10 }, padding: 10 } } }, scales: { r: { min: 0, max: 10, ticks: { color: '#6b6b8a', backdropColor: 'transparent' }, grid: { color: 'rgba(102,126,234,0.12)' }, pointLabels: { color: '#9d9dbc' }, angleLines: { color: 'rgba(102,126,234,0.12)' } } }, animation: { duration: 1500 } }
    });
}

function renderVerdictGauge(canvasId, score) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const color = score >= 8 ? '#38ef7d' : score >= 6 ? '#fdcb6e' : '#ff416c';
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [score, 10 - score], backgroundColor: [color + 'cc', 'rgba(255,255,255,0.05)'], borderColor: [color, 'transparent'], borderWidth: [2, 0], circumference: 270, rotation: 225 }] },
        options: { responsive: true, cutout: '78%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { duration: 2000 } },
        plugins: [{ id: 'centerText', afterDraw(chart) { const { ctx: c, chartArea } = chart; const cx = (chartArea.left + chartArea.right) / 2; const cy = (chartArea.top + chartArea.bottom) / 2 + 10; c.save(); c.textAlign = 'center'; c.fillStyle = '#eaeaff'; c.font = '800 42px Inter'; c.fillText(score.toFixed(1), cx, cy); c.font = '500 14px Inter'; c.fillStyle = '#9d9dbc'; c.fillText('out of 10', cx, cy + 28); c.restore(); } }]
    });
}
