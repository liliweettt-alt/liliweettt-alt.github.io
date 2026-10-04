function handleFileUpload(e) { 
    const f = e.target.files[0]; 
    if(!f) return; 
    const r = new FileReader(); 
    r.onload = (ev) => { 
        try { 
            const j = JSON.parse(ev.target.result); 
            const ficsToImport = Array.isArray(j) ? j : (j.fics || []); 
            
            if(!confirm(`You currently have ${fics.length} fics. This backup contains ${ficsToImport.length} fics. Importing will permanently replace your library. A backup of your current data will be downloaded first. Continue?`)) {
                e.target.value = '';
                return;
            }
            
            if (fics.length > 0) {
                const backup = document.createElement('a');
                backup.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({database_version:"1.0", fics:fics}, null, 2));
                backup.download = `ficlib_pre_import_backup_${new Date().toISOString().slice(0,10)}.json`;
                document.body.appendChild(backup);
                backup.click();
                backup.remove();
            }
            
            fics = ficsToImport;
            persistData(); 
            alert(`Loaded ${fics.length} fics.`); 
            switchTab('library'); 
        } catch(err) {
            alert("Invalid backup.");
        } 
    }; 
    r.readAsText(f); 
}

function exportData() { 
    const dataStr = JSON.stringify({database_version:"1.0", fics:fics}, null, 2); 
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = "ficlib_backup.json"; 
    document.body.appendChild(a); 
    a.click(); 
    setTimeout(() => {
        document.body.removeChild(a); 
        window.URL.revokeObjectURL(url);
    }, 0);
}

function clearData() { 
    if(confirm("Delete ALL data?")) { 
        fics = []; 
        queueIds = [];
        localStorage.removeItem('ficLibQueue');
        persistData(); 
        switchTab('library'); 
    } 
}
