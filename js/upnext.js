function addToQueue(id) {
    if (!queueIds.includes(id)) {
        queueIds.push(id);
        localStorage.setItem('ficLibQueue', JSON.stringify(queueIds));
        renderLibrary();
    }
}

function removeFromQueue(id) {
    queueIds = queueIds.filter(qid => qid !== id);
    localStorage.setItem('ficLibQueue', JSON.stringify(queueIds));
    const activeBtn = document.querySelector('.nav-btn.active');
    if (activeBtn) {
        if (activeBtn.id === 'btn-upnext') renderQueue();
        if (activeBtn.id === 'btn-library') renderLibrary();
    }
}

function moveQueue(index, dir) {
    if (index + dir < 0 || index + dir >= queueIds.length) return;
    const temp = queueIds[index];
    queueIds[index] = queueIds[index + dir];
    queueIds[index + dir] = temp;
    localStorage.setItem('ficLibQueue', JSON.stringify(queueIds));
    renderQueue();
}

function renderQueue() {
    const container = document.getElementById('queueList');
    container.innerHTML = '';
    if (queueIds.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-500 py-10">Your queue is empty. Bookmark fics from the library!</div>';
        return;
    }

    queueIds.forEach((id, index) => {
        const f = fics.find(x => x.id === id);
        if (!f) return;
        
        const title = escapeHTML(f.title);
        const author = escapeHTML(f.author || 'Unknown');
        const wordsDisplay = f.wordcount ? `${f.wordcount.toLocaleString()}w` : '—';
        const fandomText = (f.fandom && f.fandom.length > 0) ? escapeHTML(f.fandom.join(', ')) : 'No Fandom';
        
        const card = document.createElement('div');
        card.className = 'fic-card p-3 rounded-xl border border-slate-700/50 mb-3 flex items-center gap-3 shadow-md';
        card.innerHTML = `
            <div class="flex flex-col gap-1 border-r border-slate-700/50 pr-2">
                <button onclick="moveQueue(${index}, -1)" class="text-slate-500 hover:text-indigo-400 p-1"><i class="fa-solid fa-chevron-up"></i></button>
                <button onclick="moveQueue(${index}, 1)" class="text-slate-500 hover:text-indigo-400 p-1"><i class="fa-solid fa-chevron-down"></i></button>
            </div>
            <div class="flex-1 min-w-0 cursor-pointer" onclick="openEditModal('${id}')">
                <h3 class="font-bold text-sm text-white truncate">${title}</h3>
                <p class="text-xs text-slate-400 truncate">${author}</p>
                <p class="text-[10px] text-slate-500 mt-1">${wordsDisplay} • ${fandomText}</p>
            </div>
            <button onclick="removeFromQueue('${id}')" class="text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 p-3 rounded-xl transition-colors"><i class="fa-solid fa-bookmark"></i></button>
        `;
        container.appendChild(card);
    });
}

function renderDiscovery() {
    const container = document.getElementById('discoveryList');
    const unread = fics.filter(f => {
        const s = f.rereadStatus || 'unread';
        return s !== 'read' && s !== 'reading' && s !== 'onhold';
    });
    if (unread.length === 0) { 
        container.innerHTML = '<div class="text-center text-slate-500 py-10">All fics read or on hold!</div>'; 
        return; 
    }
    container.innerHTML = '';
    const arr = [...unread];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const shuffled = arr.slice(0, 5);
    shuffled.forEach(f => {
        const wordsDisplay = f.wordcount ? `${f.wordcount.toLocaleString()} words` : '—';
        const card = document.createElement('div'); card.className = 'fic-card p-5 rounded-xl border border-indigo-500/20 shadow-lg';
        const cwHtml = (f.cws || []).map(c => `<span class="cw-chip">${escapeHTML(c)}</span>`).join('');
        const fandomBadges = (f.fandom && f.fandom.length > 0 ? f.fandom : ['No Fandom']).map(fan => `<span class="badge bg-slate-700 text-slate-300 border border-slate-600 mr-2 mb-1">${escapeHTML(fan)}</span>`).join('');
        
        card.innerHTML = `<div class="flex justify-between items-start mb-2"><div><div class="mb-1">${fandomBadges}</div><h3 class="text-xl font-bold text-white leading-tight mt-1">${escapeHTML(f.title)}</h3><p class="text-sm text-slate-400">by ${escapeHTML(f.author)}</p></div></div><div class="flex flex-wrap gap-2 mb-3">${cwHtml} ${(f.ships||[]).map(s=>`<span class="text-indigo-300 text-xs font-bold mr-2">${escapeHTML(s)}</span>`).join('')}${(f.tags||[]).slice(0,5).map(t=>`<span class="tag-chip">${escapeHTML(t)}</span>`).join('')}</div><div class="bg-slate-900/50 p-3 rounded-lg text-sm text-slate-300 italic mb-3 border-l-2 border-slate-600">${escapeHTML(f.summary || 'No summary.')}</div><div class="flex justify-between items-center pt-2 border-t border-slate-700/50"><span class="text-xs text-slate-500 font-mono">${wordsDisplay} • ${calculateTime(f.wordcount)}</span><button type="button" class="text-xs text-slate-500 hover:text-white discovery-detail-btn">Details</button></div>`;
        
        card.querySelector('.discovery-detail-btn').onclick = () => openEditModal(f.id);
        
        container.appendChild(card);
    });
}
