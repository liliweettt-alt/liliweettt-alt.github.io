// Global State

let fics = [];
let readingGoal = { type: 'words', amount: 0 };
let chartInstances = { fandoms: null, ships: null, tags: null, daily: null, phases: null };
let tempDates = [];
let searchTimer = null;
let queueIds = JSON.parse(localStorage.getItem('ficLibQueue')) || [];

// Utilities

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, function(match) {
        const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
        return escapeMap[match];
    });
}

function getChartColor(colorVar) {
    const root = getComputedStyle(document.documentElement);
    const val = root.getPropertyValue(`--color-${colorVar}`).trim();
    if(!val) return '#ffffff';
    return `rgb(${val.split(' ').join(', ')})`;
}

function getThemeColors() {
    return [
        getChartColor('indigo-400'),
        getChartColor('purple-500'),
        getChartColor('purple-400'),
        getChartColor('indigo-500'),
        getChartColor('purple-600'),
        getChartColor('slate-500')
    ];
}

function parseDateLocal(input) { 
    if(!input) return null; 
    if(typeof input === 'string' && input.includes('-') && input.length === 10) { 
        const [y,m,d] = input.split('-').map(Number); 
        return new Date(y, m-1, d); 
    } 
    return new Date(input); 
}

function calculateTime(words) { 
    if(!words) return ""; 
    const wpm = parseInt(localStorage.getItem('ficLibWPM')) || 250; 
    const min = Math.ceil(words / wpm); 
    const h = Math.floor(min / 60); 
    const m = min % 60; 
    return h > 0 ? `${h}h ${m}m` : `${m}min`; 
}

// App Init

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('ficLibTheme') || 'tech';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themePicker = document.getElementById('themeSelector');
    if(themePicker) themePicker.value = savedTheme;

    const stored = localStorage.getItem('ficLibData');
    const storedGoal = localStorage.getItem('ficLibGoal');
    const storedWPM = localStorage.getItem('ficLibWPM');
    
    if(storedWPM) document.getElementById('inpWPM').value = storedWPM;

    if (stored) {
        try {
            fics = JSON.parse(stored);
            fics.forEach(f => {
                if(f.cover_status) { f.coverStatus = f.cover_status; delete f.cover_status; }
                if(f.reread_status) { f.rereadStatus = f.reread_status; delete f.reread_status; }
                if(f.date_finished) { f.dateFinished = f.date_finished; delete f.date_finished; }
                if(f.original_link) { f.originalLink = f.original_link; delete f.original_link; }
                
                if(typeof f.fandom === 'string') {
                    f.fandom = f.fandom.trim() ? [f.fandom.trim()] : [];
                }
                
                if(!f.availability) f.availability = 'public';

                if(!f.finishedDates) f.finishedDates = f.dateFinished ? [f.dateFinished] : [];
            });
        } catch(e) { console.error("Data load error", e); fics = []; }
        renderLibrary();
    }
    
    if (storedGoal) { 
        try { 
            const parsed = JSON.parse(storedGoal); 
            if(parsed && typeof parsed === 'object') readingGoal = parsed;
        } catch(e) { console.error("Goal load error", e); } 
    }
    
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    document.getElementById('ficForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('goalTitleYear').innerText = `${new Date().getFullYear()} Reading Goal`;
    document.getElementById('monthPicker').value = new Date().toISOString().slice(0, 7);
    
    switchStatsView('global');
});

// Navigation 

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(el => { 
        el.classList.remove('active', 'text-indigo-400'); 
        el.classList.add('text-slate-500'); 
    });
    
    const activeBtn = document.getElementById(`btn-${tab}`);
    if(activeBtn) {
        activeBtn.classList.remove('text-slate-500'); 
        activeBtn.classList.add('active', 'text-indigo-400');
    }
    
    if(tab === 'dashboard') {
        let activeView = 'global';
        if(document.getElementById('btn-stats-monthly').classList.contains('tab-btn-active')) activeView = 'monthly';
        if(document.getElementById('btn-stats-history').classList.contains('tab-btn-active')) activeView = 'history';
        switchStatsView(activeView); 
    }
    
    if(tab === 'upnext') {
        renderQueue();
        if(document.getElementById('discoveryList').innerHTML === '') {
            renderDiscovery();
        }
    }
    
    window.scrollTo(0,0);
}

function changeTheme() {
    const theme = document.getElementById('themeSelector').value;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ficLibTheme', theme);
    
    refreshActiveTab(); 
}

function refreshActiveTab() {
    const activeBtn = document.querySelector('.nav-btn.active');
    
    if(!activeBtn) {
        if(!document.getElementById('tab-settings').classList.contains('hidden')) return;
        return;
    }
    
    const activeTab = activeBtn.id.replace('btn-', '');
    if(activeTab === 'library') renderLibrary();
    if(activeTab === 'dashboard') {
        let activeView = 'global';
        if(document.getElementById('btn-stats-monthly').classList.contains('tab-btn-active')) activeView = 'monthly';
        if(document.getElementById('btn-stats-history').classList.contains('tab-btn-active')) activeView = 'history';
        switchStatsView(activeView); 
    }
    if(activeTab === 'upnext') {
        renderQueue();
    }
}

function persistData() { 
    localStorage.setItem('ficLibData', JSON.stringify(fics)); 
}

function saveWPM() { 
    localStorage.setItem('ficLibWPM', document.getElementById('inpWPM').value); 
    const activeBtn = document.querySelector('.nav-btn.active');
    if (activeBtn && activeBtn.id === 'btn-library') {
        renderLibrary(); 
    }
}
