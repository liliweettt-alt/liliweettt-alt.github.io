function populateFilterDropdowns() {
    const shipSet = new Set(), tagSet = new Set(), fandomSet = new Set(), cwSet = new Set();
    fics.forEach(f => { 
        (f.fandom || []).forEach(fan => fandomSet.add(fan.trim()));
        (f.ships || []).forEach(s => shipSet.add(s.trim())); 
        (f.tags || []).forEach(t => tagSet.add(t.trim())); 
        (f.cws || []).forEach(c => cwSet.add(c.trim()));
    });
    
    const fill = (id, items, label) => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = `<option value="all">${label}</option>`;
        items.sort((a,b) => a.localeCompare(b)).forEach(i => { 
            if(i) { 
                const opt = document.createElement('option'); 
                opt.value = i; 
                opt.innerText = i; 
                select.appendChild(opt); 
            }
        });
        if(items.includes(currentVal)) select.value = currentVal;
    };
    
    fill('filterFandom', Array.from(fandomSet), 'Fandom: All');
    fill('filterShips', Array.from(shipSet), 'Ship: All'); 
    fill('filterTags', Array.from(tagSet), 'Tag: All');
    
    const excludeSelect = document.getElementById('filterExcludeCW');
    if (excludeSelect) {
        const currentExclude = excludeSelect.value;
        excludeSelect.innerHTML = `<option value="none">Exclude CW: None</option>`;
        Array.from(cwSet).sort((a,b) => a.localeCompare(b)).forEach(i => { 
            if(i) { 
                const opt = document.createElement('option'); 
                opt.value = i; 
                opt.innerText = i; 
                excludeSelect.appendChild(opt); 
            }
        });
        if(Array.from(cwSet).includes(currentExclude)) excludeSelect.value = currentExclude;
    }
}

function populateHelperDropdowns() {
    const shipSet = new Set();
    const tagSet = new Set();
    const cwSet = new Set();
    const fandomSet = new Set();
    
    fics.forEach(f => { 
        (f.ships || []).forEach(s => shipSet.add(s.trim())); 
        (f.tags || []).forEach(t => tagSet.add(t.trim())); 
        (f.cws || []).forEach(c => cwSet.add(c.trim()));
        (f.fandom || []).forEach(fan => fandomSet.add(fan.trim()));
    });
    
    const fillSelect = (id, items) => {
        const select = document.getElementById(id);
        if (!select) return;
        
        select.innerHTML = '<option value="">Select used</option>';
        items.sort((a,b) => a.localeCompare(b)).forEach(item => { 
            if(item) { 
                const opt = document.createElement('option'); 
                opt.value = item; 
                opt.innerText = item; 
                select.appendChild(opt); 
            }
        });
    };
    
    fillSelect('selShipsHelper', Array.from(shipSet));
    fillSelect('selTagsHelper', Array.from(tagSet));
    fillSelect('selCWHelper', Array.from(cwSet));
    fillSelect('selFandomHelper', Array.from(fandomSet));
}

function pickSuggestion(targetInputId, selectDropdownId) {
    const select = document.getElementById(selectDropdownId);
    const target = document.getElementById(targetInputId);
    const selectedValue = select.value;
    
    if (selectedValue) {
        let currentText = target.value.trim();
        if (currentText && !currentText.endsWith(',')) {
            currentText += ', ';
        }
        target.value = currentText + selectedValue;
    }
    select.value = ''; 
}

function handleSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        renderLibrary();
    }, 200);
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterCompletion').value = 'all';
    document.getElementById('filterCover').value = 'all';
    document.getElementById('filterFandom').value = 'all';
    document.getElementById('filterShips').value = 'all';
    document.getElementById('filterTags').value = 'all';
    document.getElementById('filterExcludeCW').value = 'none';
    document.getElementById('filterChapters').value = 'all';
    
    const availabilityFilter = document.getElementById('filterAvailability');
    if (availabilityFilter) availabilityFilter.value = 'all';

    renderLibrary();
}

function renderLibrary() {
    populateFilterDropdowns();
    const list = document.getElementById('ficList');
    const emptyState = document.getElementById('emptyState');
    
    list.innerHTML = '';
    const search = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;
    const completionFilter = document.getElementById('filterCompletion').value;
    const coverFilter = document.getElementById('filterCover').value;
    const fandomFilter = document.getElementById('filterFandom').value;
    const shipFilter = document.getElementById('filterShips').value;
    const tagFilter = document.getElementById('filterTags').value;
    const excludeCwFilter = document.getElementById('filterExcludeCW').value;
    const chapterFilter = document.getElementById('filterChapters').value;
    
    const filterAvailabilityEl = document.getElementById('filterAvailability');
    const availabilityFilter = filterAvailabilityEl ? filterAvailabilityEl.value : 'all';
    
    const sortMode = document.getElementById('sortOption').value;

    try {
        let filtered = fics.filter(f => {
            if (availabilityFilter !== 'all' && (f.availability || 'public') !== availabilityFilter) return false;
            if (statusFilter !== 'all' && (f.rereadStatus || 'unread').toLowerCase() !== statusFilter) return false;
            if (completionFilter !== 'all' && (f.status || 'wip').toLowerCase() !== completionFilter) return false;
            if (coverFilter !== 'all') { const hasCover = (f.coverStatus === 'yes'); if (coverFilter === 'yes' && !hasCover) return false; if (coverFilter === 'not' && hasCover) return false; }
            if (fandomFilter !== 'all' && (!f.fandom || !f.fandom.includes(fandomFilter))) return false;
            
            if (excludeCwFilter !== 'none' && f.cws && f.cws.includes(excludeCwFilter)) return false;
            
            if (shipFilter !== 'all' && (!f.ships || !f.ships.includes(shipFilter))) return false;
            if (tagFilter !== 'all' && (!f.tags || !f.tags.includes(tagFilter))) return false;
            
            const chaps = f.chapters || 0;
            if (chapterFilter === 'short' && chaps >= 10) return false; if (chapterFilter === 'medium' && (chaps < 10 || chaps > 50)) return false; if (chapterFilter === 'long' && chaps <= 50) return false;
            if (search) { const txt = `${f.title} ${f.series || ''} ${(f.fandom||[]).join(' ')} ${f.author} ${(f.ships||[]).join(' ')} ${(f.tags||[]).join(' ')}`.toLowerCase(); return txt.includes(search); }
            return true;
        });

        const groups = {};
        const displayList = [];
        filtered.forEach(f => { 
            if(f.series && f.series.trim() !== "") { 
                const sName = f.series.trim(); 
                if(!groups[sName]) groups[sName] = []; 
                groups[sName].push(f); 
            } else { 
                displayList.push({ type: 'fic', data: f }); 
            } 
        });
        
        Object.keys(groups).forEach(seriesName => {
            const seriesFics = groups[seriesName];
            seriesFics.sort((a,b) => (a.seriesPart || 0) - (b.seriesPart || 0));
            const dates = seriesFics.map(f => {
                const lastDate = f.finishedDates && f.finishedDates.length ? f.finishedDates[f.finishedDates.length-1] : null; 
                const d = parseDateLocal(lastDate); return d ? d.getTime() : 0; 
            });
            displayList.push({ 
                type: 'series', title: seriesName, 
                fandom: seriesFics[0].fandom && seriesFics[0].fandom.length > 0 ? seriesFics[0].fandom[0] : 'Unknown', 
                author: seriesFics[0].author, totalWords: seriesFics.reduce((sum, f) => sum + (f.wordcount||0), 0), 
                items: seriesFics, latestTimestamp: Math.max(...dates) 
            });
        });

        displayList.sort((a, b) => {
            const getTs = (item) => { 
                if(item.type === 'series') return item.latestTimestamp || 0;
                const lastDate = item.data.finishedDates && item.data.finishedDates.length ? item.data.finishedDates[item.data.finishedDates.length-1] : null;
                const d = parseDateLocal(lastDate); return d ? d.getTime() : 0; 
            };
            const getWords = (item) => item.type === 'series' ? item.totalWords : (item.data.wordcount||0);
            const getTitle = (item) => item.type === 'series' ? item.title : item.data.title;
            const getStatus = (item) => {
                const s = item.type === 'series' 
                    ? (item.items.some(f => f.rereadStatus === 'reading') ? 'reading' : item.items[0].rereadStatus || 'unread')
                    : (item.data.rereadStatus || 'unread');
                return { reading: 1, unread: 2, onhold: 3, read: 4 }[s] ?? 2;
            };
            
            const sw = getStatus(a) - getStatus(b);
            if (sw !== 0) return sw;
            if (sortMode === 'az') return getTitle(a).localeCompare(getTitle(b)); 
            if (sortMode === 'words') return getWords(b) - getWords(a); 
            return getTs(b) - getTs(a); 
        });

        if(displayList.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            displayList.forEach(item => { 
                if (item.type === 'fic') renderFicCard(item.data, list); 
                else renderSeriesCard(item, list); 
            });
        }
    } catch(err) { 
        console.error(err); 
        list.innerHTML = `<div class="text-red-400 text-center py-5">Error rendering list. Check console.</div>`; 
    }
}    

function renderFicCard(f, container) {
    const isRead = f.rereadStatus === 'read';
    const isReading = f.rereadStatus === 'reading';
    const isOnHold = f.rereadStatus === 'onhold';
    const isComplete = (f.status || 'wip').toLowerCase() === 'complete';
    
    let availabilityBadge = '';
    if (f.availability === 'mystery') availabilityBadge = '<span class="badge bg-slate-800 text-slate-400 border border-slate-700"><i class="fa-solid fa-lock mr-1"></i> Mystery</span>';
    if (f.availability === 'deleted') availabilityBadge = '<span class="badge bg-red-900/30 text-red-400 border border-red-500/30"><i class="fa-solid fa-trash mr-1"></i> Deleted</span>';

    const statusBadge = isComplete ? '<span class="badge bg-emerald-900/30 text-emerald-400 border border-emerald-500/30">Complete</span>' : '<span class="badge bg-amber-900/30 text-amber-400 border border-amber-500/30">WIP</span>';
    const coverBadge = f.coverStatus === 'yes' ? '<span class="badge bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"><i class="fa-solid fa-image mr-1"></i> Cover</span>' : '';
    
    let readBadge = '';
if (isRead) readBadge = '<span class="px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border-l-2 border-emerald-500 text-[10px] font-bold uppercase tracking-wider shadow-sm">Read ✓</span>';
if (isReading) readBadge = '<span class="px-2 py-0.5 rounded-full bg-cyan-900/40 text-cyan-400 border-l-2 border-cyan-500 text-[10px] font-bold uppercase tracking-wider shadow-sm">Reading 📖</span>';
if (isOnHold) readBadge = '<span class="px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 border-l-2 border-amber-500 text-[10px] font-bold uppercase tracking-wider shadow-sm">On Hold ⏸</span>';

    let rereadBadge = '';
    if (f.finishedDates && f.finishedDates.length > 1) {
        rereadBadge = `<span class="badge bg-purple-900/30 text-purple-400 border border-purple-500/30"><i class="fa-solid fa-repeat mr-1"></i>Read ${f.finishedDates.length}×</span>`;
    }

    const seriesHtml = (f.series && f.series.trim() !== "") ? `<div class="text-[10px] text-indigo-300 font-bold mb-0.5 tracking-wide"><i class="fa-solid fa-layer-group mr-1"></i>Part ${f.seriesPart}</div>` : '';
    const cwHtml = (f.cws || []).map(c => `<span class="cw-chip" title="Content Warning">${escapeHTML(c)}</span>`).join('');
    const shipHtml = (f.ships || []).length > 0 ? `<span class="text-indigo-400 text-xs font-bold mr-2"><i class="fa-solid fa-heart mr-1"></i>${escapeHTML(f.ships[0])}</span>` : '';
    const readTime = calculateTime(f.wordcount);
    
    const hasSummary = f.summary && f.summary.trim() !== "";
    const hasNotes = f.notes && f.notes.trim() !== "";
    const hasTags = (f.tags || []).length > 0;
    const toggleId = `toggle-${f.id}`;
    const showToggle = hasSummary || hasNotes || hasTags;
    const toggleBtn = showToggle ? `<button type="button" onclick="event.stopPropagation(); document.getElementById('${toggleId}').classList.toggle('hidden')" class="text-slate-500 hover:text-white transition-colors p-1"><i class="fa-solid fa-chevron-down"></i></button>` : '';

    const queueBtn = queueIds.includes(f.id) 
        ? `<button type="button" onclick="event.stopPropagation(); removeFromQueue('${f.id}')" class="text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 p-1.5 rounded-lg ml-1" title="In Queue"><i class="fa-solid fa-bookmark text-xs"></i></button>`
        : `<button type="button" onclick="event.stopPropagation(); addToQueue('${f.id}')" class="text-slate-500 hover:text-white bg-slate-700/50 p-1.5 rounded-lg ml-1" title="Add to Queue"><i class="fa-regular fa-bookmark text-xs"></i></button>`;

    const safeLink = f.originalLink && /^https?:\/\//i.test(f.originalLink) ? f.originalLink : null;

    const tagsBlock = hasTags ? `<div class="flex flex-wrap gap-2 mb-3 pt-2">${(f.tags||[]).map(t=>`<span class="tag-chip">${escapeHTML(t)}</span>`).join('')}</div>` : '';
    const summaryBlock = hasSummary ? `<div class="text-sm text-slate-300 italic leading-loose tracking-wide mb-3">${escapeHTML(f.summary)}</div>` : '';
    const notesBlock = hasNotes ? `<div class="bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-lg text-xs text-indigo-200"><strong class="block text-indigo-400 mb-1 uppercase tracking-wide">My Notes</strong>${escapeHTML(f.notes)}</div>` : '';

    const wordsDisplay = f.wordcount ? `${f.wordcount.toLocaleString()}w` : '—';
    const fandomBadges = (f.fandom && f.fandom.length > 0 ? f.fandom : ['No Fandom']).map(fan => `<span class="badge bg-slate-700 text-slate-300 border border-slate-600 mr-2 mb-1">${escapeHTML(fan)}</span>`).join('');

    const item = document.createElement('div');
    item.className = 'fic-card p-4 rounded-xl relative group mb-3';
    
    item.onclick = (e) => { 
        if(!e.target.closest('button')) openEditModal(f.id); 
    };
    
    item.innerHTML = `
        <div class="flex justify-between">
            <div class="flex-1 min-w-0 pr-3">
                <div class="flex flex-wrap items-start justify-start">${fandomBadges}</div>
                ${seriesHtml}
                <h3 class="font-bold text-xl font-heading text-white truncate leading-tight mt-1 mb-1">${escapeHTML(f.title)}</h3>
                <p class="text-xs text-slate-400 mb-2 truncate">${escapeHTML(f.author || 'Unknown')}</p>
                <div class="flex flex-wrap items-center gap-2 mb-1">${availabilityBadge} ${statusBadge} ${coverBadge} ${readBadge} ${rereadBadge}</div>
                <div class="mt-2 flex flex-wrap gap-y-1">${cwHtml} ${shipHtml}</div>
            </div>
            <div class="flex flex-col items-end justify-between pl-2 min-w-[75px] border-l border-slate-700/50 my-1">
                <div class="flex items-center gap-1">
                    ${queueBtn}
                    ${safeLink ? `<button type="button" onclick="event.stopPropagation(); window.open('${escapeHTML(safeLink)}', '_blank', 'noopener,noreferrer')" class="text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500 p-1.5 rounded-lg"><i class="fa-solid fa-up-right-from-square text-xs"></i></button>` : ''} 
                    ${toggleBtn}
                </div>
                <div class="text-[10px] text-slate-500 text-right font-mono mt-auto"><span class="block text-white font-bold">${readTime}</span><span class="block">${wordsDisplay}</span>${f.chapters ? `<span class="block">${f.chapters} ch</span>` : ''}</div>
            </div>
        </div>
        <div id="${toggleId}" class="hidden mt-2 border-t border-slate-700/50 animate-fade-in">${tagsBlock}${summaryBlock}${notesBlock}</div>`;
    container.appendChild(item);
}

function renderSeriesCard(series, container) {
    const div = document.createElement('div'); div.className = 'series-folder rounded-xl mb-3 cursor-pointer overflow-hidden';
    div.onclick = function(e) { 
        if(e.target.closest('.fic-card')) return; 
        const content = this.querySelector('.series-content'); 
        const icon = this.querySelector('.chevron-icon'); 
        content.classList.toggle('hidden'); 
        icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)'; 
    };
    div.innerHTML = `<div class="p-4 flex justify-between items-center bg-slate-800/80 backdrop-blur-sm z-10 relative"><div class="flex-1"><div class="flex items-center gap-2 mb-1"><span class="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Series</span><span class="text-[10px] text-slate-400 uppercase font-bold">${escapeHTML(series.fandom)}</span></div><h3 class="font-bold text-lg text-white leading-tight">${escapeHTML(series.title)}</h3><p class="text-xs text-slate-400 mt-1">${series.items.length} Works • ${series.totalWords.toLocaleString()} words</p></div><div class="pl-4 text-slate-500"><i class="fa-solid fa-chevron-down chevron-icon transition-transform duration-300"></i></div></div><div class="series-content hidden bg-slate-900/50 p-3 space-y-2 border-t border-slate-700/50 animate-fade-in"></div>`;
    const contentBox = div.querySelector('.series-content'); 
    series.items.forEach(f => renderFicCard(f, contentBox)); 
    container.appendChild(div);
}
