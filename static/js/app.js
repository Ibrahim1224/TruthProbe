/**
 * app.js — Main application logic, SSE handling, and UI orchestration
 */

// ── State ────────────────────────────────────────────────────────────────
let selectedCategories = new Set();
let auditResults = {};
let currentMetricsData = null;

// ── Toast notifications ──────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)'; setTimeout(() => toast.remove(), 400); }, 4000);
}

// ── Load categories ──────────────────────────────────────────────────────
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        const cats = await res.json();
        const grid = document.getElementById('categories-grid');
        grid.innerHTML = '';
        Object.entries(cats).forEach(([name, info], idx) => {
            const card = document.createElement('div');
            card.className = 'category-card animate-on-scroll';
            card.style = `--delay: ${idx}`;
            card.dataset.category = name;
            card.innerHTML = `
                <div class="category-icon">${info.icon}</div>
                <h3>${name}</h3>
                <p>${info.description}</p>
                <div class="category-groups">${info.groups.map(g => `<span class="group-tag">${g}</span>`).join('')}</div>
            `;
            card.addEventListener('click', () => toggleCategory(name, card));
            grid.appendChild(card);
        });
        // Re-init scroll observer for new elements
        document.querySelectorAll('.categories-section .animate-on-scroll').forEach(el => {
            const obs = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }); }, { threshold: 0.1 });
            obs.observe(el);
        });
    } catch (e) {
        showToast('Failed to load categories', 'error');
    }
}

function toggleCategory(name, card) {
    if (selectedCategories.has(name)) {
        selectedCategories.delete(name);
        card.classList.remove('selected');
    } else {
        selectedCategories.add(name);
        card.classList.add('selected');
    }
    updateRunButton();
}

function updateRunButton() {
    const btn = document.getElementById('run-selected-btn');
    const txt = document.getElementById('run-btn-text');
    const count = selectedCategories.size;
    btn.disabled = count === 0;
    txt.textContent = count === 0 ? 'Select a Category' : `Run Audit (${count} selected)`;
}

// ── Show/hide sections ───────────────────────────────────────────────────
function showSection(id) {
    document.getElementById(id).classList.remove('hidden');
    setTimeout(() => {
        document.getElementById(id).scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Trigger scroll animations inside newly shown sections
        document.querySelectorAll(`#${id} .animate-on-scroll`).forEach(el => {
            const obs = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }); }, { threshold: 0.1 });
            obs.observe(el);
        });
    }, 100);
}

// ── Run Audit via SSE ────────────────────────────────────────────────────
function startAudit(categories) {
    auditResults = {};
    currentMetricsData = null;

    // Reset UI
    document.getElementById('live-feed').innerHTML = '';
    document.getElementById('metrics-row').innerHTML = '';
    document.getElementById('metrics-table-body').innerHTML = '';
    document.getElementById('gauges-row').innerHTML = '';
    document.getElementById('analysis-text').innerHTML = '';
    document.getElementById('recommendations-text').innerHTML = '';
    document.getElementById('category-breakdown').innerHTML = '';
    document.getElementById('results-tabs').innerHTML = '';

    // Hide result sections, show progress
    ['results', 'analysis', 'verdict'].forEach(s => document.getElementById(s).classList.add('hidden'));
    showSection('audit-progress');
    setProgress(0);

    const catParam = categories.join(',');
    const evtSource = new EventSource(`/api/audit/stream?categories=${encodeURIComponent(catParam)}`);

    evtSource.onmessage = function (e) {
        const data = JSON.parse(e.data);
        handleSSEEvent(data, evtSource);
    };

    evtSource.onerror = function () {
        evtSource.close();
        showToast('Audit stream ended', 'error');
    };
}

function handleSSEEvent(data, evtSource) {
    switch (data.type) {
        case 'category_start':
            document.getElementById('progress-category').textContent = `Auditing: ${data.category}`;
            document.getElementById('progress-label').textContent = `Category ${data.category_index + 1} of ${data.total_categories}`;
            addFeedItem('📋', data.category, `Starting audit — ${data.total_prompts} demographics to test`, 'sending');
            break;

        case 'progress':
            document.getElementById('progress-demographic').textContent = `Testing: ${data.demographic}`;
            const overallProgress = ((data.index) / data.total) * 100;
            setProgress(overallProgress);
            addFeedItem('📤', data.demographic, data.prompt_preview, 'sending');
            break;

        case 'response':
            const pct = ((data.index + 1) / data.total) * 100;
            setProgress(pct);
            addFeedItem('✅', data.demographic, data.response_preview, 'received');
            break;

        case 'metrics':
            if (!auditResults[data.category]) auditResults[data.category] = {};
            auditResults[data.category].metrics = data.data;
            currentMetricsData = data.data;
            break;

        case 'analysis_start':
            document.getElementById('progress-label').textContent = 'Gemini self-analyzing...';
            addFeedItem('🤖', 'Self-Analysis', `Asking Gemini to analyze its ${data.category} responses...`, 'sending');
            break;

        case 'analysis':
            if (!auditResults[data.category]) auditResults[data.category] = {};
            auditResults[data.category].analysis = data.text;
            auditResults[data.category].scores = data.scores;
            addFeedItem('🧠', 'Analysis Complete', `Fairness scores received for ${data.category}`, 'received');
            break;

        case 'verdict':
            renderResults();
            renderAnalysis();
            renderVerdict(data.data);
            showSection('results');
            setTimeout(() => showSection('analysis'), 500);
            setTimeout(() => showSection('verdict'), 1000);
            break;

        case 'recommendations_start':
            document.getElementById('progress-label').textContent = 'Generating recommendations...';
            break;

        case 'recommendations':
            document.getElementById('recommendations-text').innerHTML = marked.parse(data.text);
            break;

        case 'complete':
            setProgress(100);
            document.getElementById('progress-label').textContent = 'Complete!';
            showToast('Audit complete!', 'success');
            evtSource.close();
            break;

        case 'error':
            showToast(data.message, 'error');
            evtSource.close();
            break;
    }
}

function addFeedItem(icon, title, text, type) {
    const feed = document.getElementById('live-feed');
    const item = document.createElement('div');
    item.className = `feed-item ${type}`;
    item.innerHTML = `<span class="feed-icon">${icon}</span><div class="feed-content"><div class="feed-demo">${title}</div><div class="feed-preview">${text}</div></div>`;
    feed.insertBefore(item, feed.firstChild);
    if (feed.children.length > 20) feed.lastChild.remove();
}

// ── Render results dashboard ─────────────────────────────────────────────
function renderResults() {
    const categories = Object.keys(auditResults);

    // Tabs
    const tabsEl = document.getElementById('results-tabs');
    tabsEl.innerHTML = '';
    if (categories.length > 1) {
        categories.forEach((cat, i) => {
            const tab = document.createElement('div');
            tab.className = `result-tab ${i === 0 ? 'active' : ''}`;
            tab.textContent = cat;
            tab.addEventListener('click', () => switchResultsTab(cat));
            tabsEl.appendChild(tab);
        });
    }

    // Show first category
    if (categories.length > 0) showCategoryResults(categories[0]);
}

function switchResultsTab(category) {
    document.querySelectorAll('.result-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.result-tab').forEach(t => { if (t.textContent === category) t.classList.add('active'); });
    showCategoryResults(category);
}

function showCategoryResults(category) {
    const data = auditResults[category];
    if (!data || !data.metrics) return;
    const metrics = data.metrics;

    // Metric cards
    const avgLen = Math.round(metrics.reduce((s, m) => s + m.response_length, 0) / metrics.length);
    const avgSent = (metrics.reduce((s, m) => s + m.sentiment, 0) / metrics.length).toFixed(3);
    const totalEnc = metrics.reduce((s, m) => s + m.encouragement, 0);
    const totalDisc = metrics.reduce((s, m) => s + m.discouragement, 0);

    document.getElementById('metrics-row').innerHTML = `
        <div class="metric-card mc-blue"><div class="metric-label">Avg Response Length</div><div class="metric-value">${avgLen}</div></div>
        <div class="metric-card mc-green"><div class="metric-label">Avg Sentiment</div><div class="metric-value">${avgSent}</div></div>
        <div class="metric-card mc-amber"><div class="metric-label">Total Encouragement</div><div class="metric-value">${totalEnc}</div></div>
        <div class="metric-card mc-red"><div class="metric-label">Total Discouragement</div><div class="metric-value">${totalDisc}</div></div>
    `;

    // Charts
    renderLengthChart('chart-length', metrics);
    renderSentimentChart('chart-sentiment', metrics);
    renderEncDiscChart('chart-enc-disc', metrics);
    renderRadarChart('chart-radar', metrics);

    // Table
    const tbody = document.getElementById('metrics-table-body');
    tbody.innerHTML = metrics.map(m => `
        <tr>
            <td><strong>${m.demographic}</strong></td>
            <td>${m.response_length}</td>
            <td>${m.sentiment.toFixed(4)}</td>
            <td>${m.sentiment_label}</td>
            <td style="color:#38ef7d">${m.encouragement}</td>
            <td style="color:#ff416c">${m.discouragement}</td>
        </tr>
    `).join('');
}

// ── Render analysis ──────────────────────────────────────────────────────
function renderAnalysis() {
    const gaugesRow = document.getElementById('gauges-row');
    gaugesRow.innerHTML = '';
    const analysisTextEl = document.getElementById('analysis-text');
    let allAnalysisHtml = '';

    Object.entries(auditResults).forEach(([cat, data]) => {
        if (data.scores) {
            Object.entries(data.scores).forEach(([group, score]) => {
                const color = score >= 8 ? '#38ef7d' : score >= 6 ? '#fdcb6e' : '#ff416c';
                const gauge = document.createElement('div');
                gauge.className = 'gauge-item';
                gauge.innerHTML = `
                    <div class="gauge-score" style="color:${color}">${score}</div>
                    <div class="gauge-label">${group}</div>
                    <div class="gauge-bar"><div class="gauge-fill" style="width:${score * 10}%;background:${color}"></div></div>
                `;
                gaugesRow.appendChild(gauge);
            });
        }
        if (data.analysis) {
            allAnalysisHtml += `<h4 style="color:#667eea;margin-top:1rem">${cat}</h4>` + marked.parse(data.analysis);
        }
    });

    analysisTextEl.innerHTML = allAnalysisHtml;
}

// ── Render verdict ───────────────────────────────────────────────────────
function renderVerdict(verdictData) {
    const banner = document.getElementById('verdict-banner');
    const label = document.getElementById('verdict-label');
    const score = document.getElementById('verdict-score');

    label.textContent = verdictData.verdict === 'Fair' ? '✅ Fair' : verdictData.verdict === 'Partially Fair' ? '⚠️ Partially Fair' : '🚨 Biased';
    score.textContent = `Overall Fairness: ${verdictData.overall_score}/10`;

    banner.className = 'verdict-banner';
    if (verdictData.verdict === 'Fair') banner.classList.add('fair');
    else if (verdictData.verdict === 'Partially Fair') banner.classList.add('partial');
    else banner.classList.add('biased');

    renderVerdictGauge('verdict-gauge', verdictData.overall_score);

    // Category breakdown
    const breakdown = document.getElementById('category-breakdown');
    breakdown.innerHTML = '';
    Object.entries(verdictData.category_averages || {}).forEach(([cat, avg]) => {
        const color = avg >= 8 ? '#38ef7d' : avg >= 6 ? '#fdcb6e' : '#ff416c';
        breakdown.innerHTML += `<div class="breakdown-item"><span class="breakdown-name">${cat}</span><span class="breakdown-score" style="color:${color}">${avg}/10</span></div>`;
    });
}

// ── Download handlers ────────────────────────────────────────────────────
function downloadReport(format) {
    const payload = { format, results: auditResults };
    fetch('/api/audit/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(res => res.blob())
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = format === 'csv' ? 'truthprobe_audit_report.csv' : 'truthprobe_gemini_analysis.txt';
            a.click();
            URL.revokeObjectURL(url);
        })
        .catch(() => showToast('Download failed', 'error'));
}

// ── Init ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadCategories();

    document.getElementById('run-selected-btn').addEventListener('click', () => {
        if (selectedCategories.size > 0) startAudit([...selectedCategories]);
    });

    document.getElementById('run-all-btn').addEventListener('click', () => startAudit(['all']));

    document.getElementById('download-csv-btn').addEventListener('click', () => downloadReport('csv'));
    document.getElementById('download-txt-btn').addEventListener('click', () => downloadReport('txt'));
});
