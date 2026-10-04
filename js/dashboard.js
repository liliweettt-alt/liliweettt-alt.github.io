function switchStatsView(view) {
    document.getElementById('view-stats-global').classList.toggle('hidden', view !== 'global');
    document.getElementById('view-stats-monthly').classList.toggle('hidden', view !== 'monthly');
    document.getElementById('view-stats-history').classList.toggle('hidden', view !== 'history');
    
    const btnGlobal = document.getElementById('btn-stats-global');
    const btnMonthly = document.getElementById('btn-stats-monthly');
    const btnHistory = document.getElementById('btn-stats-history');
    
    [btnGlobal, btnMonthly, btnHistory].forEach(btn => {
        btn.classList.remove('tab-btn-active');
        btn.classList.add('tab-btn-inactive');
    });
    
    if(view === 'global') {
        btnGlobal.classList.add('tab-btn-active'); btnGlobal.classList.remove('tab-btn-inactive');
        updateDashboard();
    } else if (view === 'monthly') {
        btnMonthly.classList.add('tab-btn-active'); btnMonthly.classList.remove('tab-btn-inactive');
        renderMonthlyStats();
    } else {
        btnHistory.classList.add('tab-btn-active'); btnHistory.classList.remove('tab-btn-inactive');
        updateReport();
    }
}

function updateDashboard() {
    const readFics = fics.filter(f => f.rereadStatus === 'read');
    const readingFics = fics.filter(f => f.rereadStatus === 'reading');
    
    let totalReadWords = 0;
    readFics.forEach(f => {
        const readCount = (f.finishedDates && f.finishedDates.length > 0) ? f.finishedDates.length : 1; 
        totalReadWords += (f.wordcount || 0) * readCount;
    });
    readingFics.forEach(f => {
        totalReadWords += (f.readProgress || 0);
    });

    document.getElementById('stat-total').innerText = fics.length; 
    document.getElementById('stat-words').innerText = totalReadWords.toLocaleString();
    document.getElementById('stat-active').innerText = readingFics.length;
    
    document.getElementById('stat-read-count').innerText = `Read: ${readFics.length}`;
    document.getElementById('stat-unread-count').innerText = `Unread: ${fics.length - readFics.length}`;
    const pct = fics.length ? Math.round((readFics.length / fics.length) * 100) : 0;
    const bar = document.getElementById('stat-progress-bar'); 
    bar.style.width = `${pct}%`; bar.innerText = `${pct}%`;

    renderPieChart('chartFandoms', readFics, f => f.fandom, 'fandoms');
    renderPieChart('chartShips', readFics, f => f.ships, 'ships');
    renderPieChart('chartTags', readFics, f => f.tags, 'tags'); 
    
    renderFandomPhases();
    updateGoalUI();
}

function renderFandomPhases() {
    const buckets = [];
    const labels = [];
    const now = new Date();
    
    for(let i=11; i>=0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
        buckets.push({ year: d.getFullYear(), month: d.getMonth(), fandoms: {} });
    }

    let recentFandomCount = {};
    fics.forEach(f => {
        if (f.rereadStatus === 'read' && f.finishedDates) {
            f.finishedDates.forEach(dStr => {
                const d = parseDateLocal(dStr);
                if (!d) return;
                const monthDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
                if (monthDiff >= 0 && monthDiff < 12) {
                    const fans = (f.fandom && f.fandom.length > 0) ? f.fandom : ['Unknown'];
                    fans.forEach(fan => {
                        fan = fan.trim();
                        recentFandomCount[fan] = (recentFandomCount[fan] || 0) + 1;
                        const bucketIndex = 11 - monthDiff;
                        buckets[bucketIndex].fandoms[fan] = (buckets[bucketIndex].fandoms[fan] || 0) + 1;
                    });
                }
            });
        }
    });

    const topFandoms = Object.entries(recentFandomCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]);
    const datasets = [];
    const colors = getThemeColors();
    
    topFandoms.forEach((fan, i) => {
        const data = buckets.map(b => b.fandoms[fan] || 0);
        datasets.push({ label: escapeHTML(fan), data: data, backgroundColor: colors[i] });
    });

    const otherData = buckets.map(b => {
        let otherCount = 0;
        Object.keys(b.fandoms).forEach(fan => {
            if(!topFandoms.includes(fan)) otherCount += b.fandoms[fan];
        });
        return otherCount;
    });
    datasets.push({ label: 'Other', data: otherData, backgroundColor: colors[5] });

    const ctx = document.getElementById('chartFandomPhases').getContext('2d');
    if(chartInstances.phases) chartInstances.phases.destroy();

    const textMuted = getChartColor('slate-500');
    const borderMuted = getChartColor('slate-700');
    const legendText = getChartColor('slate-300');
    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim().replace(/['"]/g, '') || 'sans-serif';

    chartInstances.phases = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: textMuted, font: { size: 9, family: fontFamily } } },
                y: { stacked: true, border: { display: false }, grid: { color: borderMuted }, ticks: { color: textMuted, font: { size: 9, family: fontFamily }, precision: 0 } }
            },
            plugins: { 
                legend: { 
                    display: true, 
                    position: 'bottom',
                    labels: {
                        color: legendText,
                        font: { size: 10, family: fontFamily },
                        boxWidth: 12
                    }
                } 
            }
        }
    });
}

function renderMonthlyStats() {
    const pickerVal = document.getElementById('monthPicker').value;
    if(!pickerVal) return;
    const [year, month] = pickerVal.split('-').map(Number);
    
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 1) {
        prevMonth = 12;
        prevYear--;
    }

    const now = new Date();
    const isCurrentMonth = (year === now.getFullYear() && month === (now.getMonth() + 1));
    
    const monthFics = [];
    let wordsInMonth = 0;
    let lmFics = 0;
    let lmWords = 0;
    
    fics.forEach(f => {
        if(f.rereadStatus === 'read' && f.finishedDates) {
            f.finishedDates.forEach(dateStr => {
                const d = parseDateLocal(dateStr);
                if(d) {
                    const dYear = d.getFullYear();
                    const dMonth = d.getMonth() + 1;
                    if(dYear === year && dMonth === month) {
                        monthFics.push(f);
                        wordsInMonth += (f.wordcount || 0);
                    } else if (dYear === prevYear && dMonth === prevMonth) {
                        lmFics++;
                        lmWords += (f.wordcount || 0);
                    }
                }
            });
        }
    });

    if(isCurrentMonth) {
        fics.filter(f => f.rereadStatus === 'reading').forEach(f => {
            wordsInMonth += (f.readProgress || 0);
        });
    }

    document.getElementById('month-words').innerText = wordsInMonth.toLocaleString();
    document.getElementById('month-count').innerText = monthFics.length;

    const calcChange = (cur, prev) => {
        if (prev === 0) return cur > 0 ? '+100%' : '0%';
        const p = Math.round(((cur - prev) / prev) * 100);
        return p >= 0 ? `+${p}%` : `${p}%`;
    };
    
    const applyChangeUI = (id, valStr) => {
        const el = document.getElementById(id);
        el.innerText = valStr;
        if(valStr.startsWith('+')) {
            el.className = 'text-xs font-bold text-emerald-400';
            el.innerHTML = `<i class="fa-solid fa-arrow-up text-[9px] mr-0.5"></i>${valStr}`;
        } else if (valStr === '0%') {
            el.className = 'text-xs font-bold text-slate-500';
        } else {
            el.className = 'text-xs font-bold text-red-400';
            el.innerHTML = `<i class="fa-solid fa-arrow-down text-[9px] mr-0.5"></i>${valStr.replace('-', '')}`;
        }
    };
    
    applyChangeUI('month-fics-change', calcChange(monthFics.length, lmFics));
    applyChangeUI('month-words-change', calcChange(wordsInMonth, lmWords));

    const daysInMonth = new Date(year, month, 0).getDate();
    const labels = Array.from({length: daysInMonth}, (_, i) => i + 1);
    const data = new Array(daysInMonth).fill(0);
    
    fics.forEach(f => {
        if(!f.finishedDates) return;
        f.finishedDates.forEach(dateStr => {
            const d = parseDateLocal(dateStr);
            if(d && d.getFullYear() === year && (d.getMonth() + 1) === month) {
                data[d.getDate() - 1] += (f.wordcount || 0);
            }
        });
    });

    const ctx = document.getElementById('chartDaily').getContext('2d');
    if(chartInstances.daily) chartInstances.daily.destroy();
    
    const textMuted = getChartColor('slate-500');
    const borderMuted = getChartColor('slate-700');
    const barColor = getChartColor('indigo-400');
    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim().replace(/['"]/g, '') || 'sans-serif';

    chartInstances.daily = new Chart(ctx, { 
        type: 'bar', 
        data: { labels: labels, datasets: [{ label: 'Words', data: data, backgroundColor: barColor, borderRadius: 3 }] }, 
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: textMuted, font: { size: 9, family: fontFamily } } }, y: { border: { display: false }, grid: { color: borderMuted }, ticks: { color: textMuted, font: { size: 9, family: fontFamily } } } } } 
    });

    const renderList = (id, keyFn) => {
        const counts = {};
        monthFics.forEach(f => { const keys = keyFn(f); (Array.isArray(keys)?keys:[keys]).forEach(k => { if(k) counts[k] = (counts[k] || 0) + 1; }); });
        const top = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 3);
        document.getElementById(id).innerHTML = top.map(([k,v]) => `<div class="flex justify-between text-xs py-1 border-b border-slate-700/50 last:border-0"><span class="text-slate-300 truncate w-2/3">${escapeHTML(k)}</span><span class="text-indigo-400 font-bold">${v}</span></div>`).join('') || '<p class="text-xs text-slate-500 italic">No data</p>';
    };
    renderList('month-top-fandoms', f => f.fandom);
    renderList('month-top-ships', f => f.ships);
    renderList('month-top-tags', f => f.tags);
}

function renderPieChart(canvasId, list, keyFn, instanceName) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (chartInstances[instanceName]) chartInstances[instanceName].destroy();

    const counts = {};
    list.forEach(f => { 
        const keys = keyFn(f); 
        if (Array.isArray(keys)) keys.forEach(k => counts[k] = (counts[k] || 0) + 1); 
        else if (keys) counts[keys] = (counts[keys] || 0) + 1; 
    });
    
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const legendText = getChartColor('slate-300');
    const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim().replace(/['"]/g, '') || 'sans-serif';
    
    if (sorted.length === 0) {
        chartInstances[instanceName] = new Chart(ctx, { 
            type: 'doughnut', 
            data: { labels: ['No Data'], datasets: [{ data: [1], backgroundColor: [getChartColor('slate-700')], borderColor: getChartColor('slate-800'), borderWidth: 2 }] }, 
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } } 
        });
        return;
    }

    const labels = sorted.map(x => escapeHTML(x[0])); 
    const data = sorted.map(x => x[1]);
    const colors = getThemeColors();
    const borderColor = getChartColor('slate-800');
    
    chartInstances[instanceName] = new Chart(ctx, { 
        type: 'doughnut', 
        data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderColor: borderColor, borderWidth: 2 }] }, 
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: legendText, font: { size: 10, family: fontFamily }, boxWidth: 10 } } } } 
    });
}

function generateShareCard() {
    const year = new Date().getFullYear();
    let yearFics = 0;
    let yearWords = 0;
    let fandomCount = {};
    let shipCount = {};
    let tagCount = {};

    fics.forEach(f => {
        if (f.rereadStatus === 'read' && f.finishedDates) {
            let readsThisYear = 0;
            f.finishedDates.forEach(dStr => {
                const d = parseDateLocal(dStr);
                if (d && d.getFullYear() === year) {
                    readsThisYear++;
                    yearFics++;
                    yearWords += (f.wordcount || 0);
                }
            });

            if (readsThisYear > 0) {
                (f.fandom || []).forEach(fan => {
                    fan = fan.trim();
                    fandomCount[fan] = (fandomCount[fan] || 0) + readsThisYear;
                });
                (f.ships || []).forEach(s => {
                    const ship = s.trim();
                    shipCount[ship] = (shipCount[ship] || 0) + readsThisYear;
                });
                (f.tags || []).forEach(t => {
                    const tag = t.trim();
                    tagCount[tag] = (tagCount[tag] || 0) + readsThisYear;
                });
            }
        }
    });

    const topFandoms = Object.entries(fandomCount).sort((a,b)=>b[1]-a[1]).slice(0, 3).map(x=>x[0]);
    const topTags = Object.entries(tagCount).sort((a,b)=>b[1]-a[1]).slice(0, 3).map(x=>x[0]);
    const topShip = Object.entries(shipCount).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'None';
    const novels = Math.floor(yearWords / 90000);

    const canvas = document.getElementById('shareCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 1080, 1080);
    
    const root = getComputedStyle(document.documentElement);
    const getRgb = (v) => `rgb(${root.getPropertyValue(v).trim().split(' ').join(',')})`;
    const getRgba = (v, a) => `rgba(${root.getPropertyValue(v).trim().split(' ').join(',')}, ${a})`;
    
    const fontHeading = root.getPropertyValue('--font-heading').trim().replace(/['"]/g, '') || 'sans-serif';
    const fontBody = root.getPropertyValue('--font-body').trim().replace(/['"]/g, '') || 'sans-serif';

    ctx.fillStyle = getRgb('--color-slate-900');
    ctx.fillRect(0, 0, 1080, 1080);

    const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
    gradient.addColorStop(0, getRgba('--color-indigo-400', 0.2));
    gradient.addColorStop(1, getRgb('--color-slate-900'));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1080);

    ctx.fillStyle = getRgb('--color-slate-100') || '#f1f5f9';
    ctx.font = `bold 80px ${fontHeading}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${year} in Reading`, 540, 120);

    ctx.font = `bold 130px ${fontHeading}`;
    ctx.fillStyle = getRgb('--color-indigo-400');
    ctx.fillText(`${yearFics}`, 540, 300);
    ctx.font = `bold 40px ${fontBody}`;
    ctx.fillStyle = getRgb('--color-slate-400');
    ctx.fillText(`FICS FINISHED`, 540, 360);
    
    let wordText = yearWords >= 1000000 ? (yearWords/1000000).toFixed(1) + 'M' : yearWords.toLocaleString();
    ctx.font = `bold 120px ${fontHeading}`;
    ctx.fillStyle = getRgb('--color-purple-400');
    ctx.fillText(`${wordText}`, 540, 520);
    ctx.font = `bold 36px ${fontBody}`;
    ctx.fillStyle = getRgb('--color-slate-400');
    ctx.fillText(`WORDS READ (that's about ${novels} novels!)`, 540, 580);

    ctx.font = `bold 45px ${fontHeading}`;
    ctx.fillStyle = getRgb('--color-slate-100') || '#f1f5f9';
    
    ctx.textAlign = 'left';
    ctx.fillText(`Top Fandoms`, 100, 720);
    
    ctx.textAlign = 'right';
    ctx.fillText(`Top Tags`, 980, 720);

    ctx.font = `40px ${fontBody}`;
    ctx.fillStyle = getRgb('--color-slate-300');
    
    ctx.textAlign = 'left';
    topFandoms.forEach((fan, i) => {
        ctx.fillText(`${i+1}. ${fan.length > 20 ? fan.substring(0,18)+'...' : fan}`, 100, 790 + (i*60));
    });

    ctx.textAlign = 'right';
    topTags.forEach((tag, i) => {
        ctx.fillText(`${tag.length > 22 ? tag.substring(0,20)+'...' : tag} .${i+1}`, 980, 790 + (i*60));
    });
    ctx.font = `bold 45px ${fontHeading}`;
    ctx.fillStyle = getRgb('--color-slate-100') || '#f1f5f9';
    ctx.textAlign = 'center';
    ctx.fillText(`Top Ship`, 540, 950);
    
    ctx.font = `40px ${fontBody}`;
    ctx.fillStyle = getRgb('--color-slate-300');
    ctx.fillText(`${topShip.length > 35 ? topShip.substring(0,32)+'...' : topShip}`, 540, 1020);

    document.getElementById('shareModal').classList.remove('hidden');
}

function downloadShareCard() {
    const canvas = document.getElementById('shareCanvas');
    const link = document.createElement('a');
    link.download = `FicLib_Review_${new Date().getFullYear()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function closeShareModal() {
    document.getElementById('shareModal').classList.add('hidden');
}

function toggleGoalEdit() { 
    try {
        const editor = document.getElementById('goalEditor'); 
        if (!editor) return;
        
        const isHidden = editor.classList.contains('hidden');
        if (isHidden) {
            editor.classList.remove('hidden'); 
            document.getElementById('goalType').value = (readingGoal && readingGoal.type) ? readingGoal.type : 'words'; 
            document.getElementById('goalNumber').value = (readingGoal && readingGoal.amount > 0) ? readingGoal.amount : ''; 
        } else {
            editor.classList.add('hidden');
        }
    } catch (e) { console.error("Error opening edit goal:", e); }
}

function saveGoal() { 
    try {
        const type = document.getElementById('goalType').value || 'words'; 
        const amount = parseInt(document.getElementById('goalNumber').value); 
        
        if(amount > 0) { 
            readingGoal = { type: type, amount: amount }; 
            localStorage.setItem('ficLibGoal', JSON.stringify(readingGoal)); 
            toggleGoalEdit(); 
            updateGoalUI(); 
        } else { 
            alert("Please enter a valid number greater than 0."); 
        } 
    } catch (e) { console.error("Error saving goal:", e); }
}

function updateGoalUI() {
    const currentYear = new Date().getFullYear();
    let finishedThisYearCount = 0;
    let finishedThisYearWords = 0;

    fics.forEach(f => {
        if(f.rereadStatus === 'read' && f.finishedDates) {
            f.finishedDates.forEach(dateStr => {
                const d = parseDateLocal(dateStr);
                if(d && d.getFullYear() === currentYear) {
                    finishedThisYearCount++;
                    finishedThisYearWords += (f.wordcount || 0);
                }
            });
        }
    });

    fics.filter(f => f.rereadStatus === 'reading').forEach(f => {
        finishedThisYearWords += (f.readProgress || 0);
    });

    const safeType = (readingGoal && readingGoal.type) ? readingGoal.type : 'words';
    const target = (readingGoal && readingGoal.amount > 0) ? readingGoal.amount : 1; 
    
    let currentVal = (safeType === 'words') ? finishedThisYearWords : finishedThisYearCount;
    let pct = Math.round((currentVal / target) * 100); if(pct > 100) pct = 100;
    
    document.getElementById('goalTextCurrent').innerText = currentVal.toLocaleString();
    document.getElementById('goalTextTarget').innerText = `/ ${target.toLocaleString()} ${safeType}`;
    document.getElementById('goalProgressBar').style.width = `${pct}%`; document.getElementById('goalProgressBar').innerText = `${pct}%`;
    
    const msg = document.getElementById('goalMessage');
    if(currentVal >= target && target > 1) { 
        msg.innerText = "Goal Reached! Amazing!"; 
        msg.className = "text-center text-[10px] goal-message-success mt-2 font-bold"; 
    } else { 
        msg.innerText = `Tracking ${safeType} for ${currentYear}`; 
        msg.className = "text-center text-[10px] text-slate-500 mt-2 italic"; 
    }
}

function updateReport() {
    const container = document.getElementById('reportContent');
    const picker = document.getElementById('historyYearPicker');
    const statsHeader = document.getElementById('history-stats-header');

    const allReads = [];
    fics.forEach(f => {
        if(f.rereadStatus === 'read' && f.finishedDates) {
            f.finishedDates.forEach(dateStr => {
                const d = parseDateLocal(dateStr);
                if(d) allReads.push({ ...f, dateObj: d });
            });
        }
    });

    if (allReads.length === 0) { 
        container.innerHTML = '<div class="text-center text-slate-600 py-10">No finished dates logged</div>';
        picker.style.display = 'none'; statsHeader.style.display = 'none'; return;
    }

    const years = [...new Set(allReads.map(r => r.dateObj.getFullYear()))].sort((a,b) => b-a);
    
    const currentSelected = picker.value;
    picker.innerHTML = '';
    years.forEach(y => { 
        const opt = document.createElement('option'); 
        opt.value = y; 
        opt.innerText = y; 
        picker.appendChild(opt); 
    });

    if(years.includes(parseInt(currentSelected))) {
        picker.value = currentSelected;
    } else if (years.length > 0) {
        picker.value = years[0];
    }
    
    picker.style.display = 'block'; statsHeader.style.display = 'flex';

    const selectedYear = parseInt(picker.value);
    const yearReads = allReads.filter(r => r.dateObj.getFullYear() === selectedYear);

    const yearWords = yearReads.reduce((s,f) => s + (f.wordcount || 0), 0);
    document.getElementById('hist-year-words').innerText = yearWords.toLocaleString();
    document.getElementById('hist-year-count').innerText = yearReads.length;

    const groups = {};
    yearReads.forEach(f => { const m = f.dateObj.getMonth(); if(!groups[m]) groups[m]=[]; groups[m].push(f); });
    
    container.innerHTML = '';
    Object.keys(groups).sort((a,b)=>b-a).forEach(m => {
        const monthName = new Date(selectedYear, m).toLocaleString('default', { month: 'long' });
        const mDiv = document.createElement('div'); 
        mDiv.className = 'bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden mb-4';
        mDiv.innerHTML = `<div class="bg-slate-700/50 px-5 py-3 font-bold flex justify-between"><span class="text-indigo-300 font-heading">${monthName}</span><span class="badge bg-slate-600 text-white">${groups[m].length}</span></div><div class="p-3 space-y-2"></div>`;
        const contentBox = mDiv.querySelector('div:last-child');
        
        groups[m].sort((a,b)=>b.dateObj-a.dateObj).forEach(f => {
            contentBox.innerHTML += `<div class="flex justify-between items-center text-sm py-2 px-2 hover:bg-slate-700/30 rounded-lg"><span class="truncate w-3/4 font-medium text-slate-300">${escapeHTML(f.title)}</span><span class="text-slate-500 text-xs font-mono">${f.dateObj.getDate()}</span></div>`;
        });
        container.appendChild(mDiv);
    });
}
