function renderDateList() {
    const container = document.getElementById('dateListContainer');
    container.innerHTML = '';
    tempDates.sort().reverse().forEach((d, index) => {
        const chip = document.createElement('div');
        chip.className = "flex justify-between items-center bg-slate-900/50 px-3 py-1.5 rounded-lg text-xs border border-slate-700";
        chip.innerHTML = `<span class="font-mono text-indigo-300">${d}</span><button type="button" onclick="removeDate(${index})" class="text-slate-500 hover:text-red-400"><i class="fa-solid fa-xmark"></i></button>`;
        container.appendChild(chip);
    });
}

function addFinishDate() {
    const input = document.getElementById('inpNewDate');
    if(input.value) {
        tempDates.push(input.value);
        tempDates.sort();
        renderDateList();
        input.value = '';
    }
}

function removeDate(index) {
    tempDates.splice(index, 1);
    renderDateList();
}

function toggleDateVisibility() { 
    const s = document.getElementById('inpReadStatus').value; 
    document.getElementById('divDateFinished').classList.toggle('hidden', s !== 'read');
    document.getElementById('divReadProgress').classList.toggle('hidden', s !== 'reading');
}

function openEditModal(id) {
    const f = fics.find(x => x.id === id); 
    if(!f) return;
    
    document.getElementById('editId').value = f.id; 
    document.getElementById('modalTitle').innerText = 'Edit Fic';
    document.getElementById('inpTitle').value = f.title || '';
    document.getElementById('inpAuthor').value = f.author || '';
    document.getElementById('inpFandom').value = (f.fandom || []).join(', ');
    document.getElementById('inpStatus').value = f.status || 'wip';
    
    const inpAvailability = document.getElementById('inpAvailability');
    if(inpAvailability) inpAvailability.value = f.availability || 'public';
    
    document.getElementById('inpSummary').value = f.summary || '';
    document.getElementById('inpNotes').value = f.notes || '';   
    document.getElementById('inpLink').value = f.originalLink || '';
    document.getElementById('inpWords').value = f.wordcount || '';
    document.getElementById('inpChapters').value = f.chapters || '';
    document.getElementById('inpReadStatus').value = f.rereadStatus || 'unread'; 
    document.getElementById('inpCoverStatus').value = f.coverStatus || 'not';
    document.getElementById('inpSeries').value = f.series || ''; 
    document.getElementById('inpSeriesPart').value = f.seriesPart || '';
    document.getElementById('inpShips').value = (f.ships || []).join(', '); 
    document.getElementById('inpTags').value = (f.tags || []).join(', ');
    document.getElementById('inpCW').value = (f.cws || []).join(', ');
    document.getElementById('inpReadProgress').value = f.readProgress || '';

    tempDates = f.finishedDates ? [...f.finishedDates] : [];
    renderDateList();

    populateHelperDropdowns();

    document.getElementById('btnDelete').classList.remove('hidden'); 
    toggleDateVisibility(); 
    document.getElementById('ficModal').classList.remove('hidden');
}

function openAddModal() { 
    document.getElementById('ficForm').reset(); 
    document.getElementById('editId').value = ''; 
    document.getElementById('modalTitle').innerText = 'Add New Fic'; 
    document.getElementById('btnDelete').classList.add('hidden'); 
    
    tempDates = [];
    renderDateList();
    
    toggleDateVisibility(); 
    populateHelperDropdowns();

    document.getElementById('ficModal').classList.remove('hidden'); 
}

function closeModal() { document.getElementById('ficModal').classList.add('hidden'); }

function deleteFic() { 
    if(confirm("Delete this fic?")) { 
        const idToRemove = document.getElementById('editId').value;
        fics = fics.filter(f => f.id !== idToRemove); 
        removeFromQueue(idToRemove); 
        persistData(); 
        closeModal();
        refreshActiveTab();
    } 
}

function handleFormSubmit(e) {
    e.preventDefault(); 
    const id = document.getElementById('editId').value;
    const titleVal = document.getElementById('inpTitle').value.trim();
    if (!titleVal) {
        document.getElementById('inpTitle').focus();
        document.getElementById('inpTitle').style.borderColor = 'rgb(239 68 68)';
        setTimeout(() => document.getElementById('inpTitle').style.borderColor = '', 2000);
        return;
    }
    const sortedDates = [...tempDates].sort();
    const latestDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

    const inpAvailability = document.getElementById('inpAvailability');
    const obj = {
        id: id || crypto.randomUUID(), 
        title: document.getElementById('inpTitle').value, 
        author: document.getElementById('inpAuthor').value, 
        fandom: document.getElementById('inpFandom').value.split(',').map(s=>s.trim()).filter(s=>s),
        originalLink: document.getElementById('inpLink').value, 
        rereadStatus: document.getElementById('inpReadStatus').value, 
        coverStatus: document.getElementById('inpCoverStatus').value,
        availability: inpAvailability ? inpAvailability.value : 'public',
        status: document.getElementById('inpStatus').value, 
        wordcount: parseInt(document.getElementById('inpWords').value) || 0, 
        chapters: parseInt(document.getElementById('inpChapters').value) || 0,
        summary: document.getElementById('inpSummary').value, 
        notes: document.getElementById('inpNotes').value,
        ships: document.getElementById('inpShips').value.split(',').map(s=>s.trim()).filter(s=>s), 
        tags: document.getElementById('inpTags').value.split(',').map(s=>s.trim()).filter(s=>s),
        cws: document.getElementById('inpCW').value.split(',').map(s=>s.trim()).filter(s=>s),
        readProgress: parseInt(document.getElementById('inpReadProgress').value) || 0,
        finishedDates: [...tempDates],
        dateFinished: latestDate,
        series: document.getElementById('inpSeries').value.trim(), 
        seriesPart: parseInt(document.getElementById('inpSeriesPart').value) || 0
    };
    
    if(id) { 
        const idx = fics.findIndex(x => x.id === id); 
        fics[idx] = {...fics[idx], ...obj}; 
    } else {
        fics.unshift(obj);
    }
    
    persistData(); 
    closeModal();
    refreshActiveTab();
}
