document.addEventListener('DOMContentLoaded', () => {

    const SESSION_STORAGE_KEY = 'INSIDER_NITT_AUTH_TOKEN';
    let currentSessionUser = { name: "GUEST", status: "UNAUTHORIZED" };
    let globalCachedExperiences = [];
    let globalCachedMocks = [];
    let activeMockSubTab = "HOSTING"; // Tracks 'HOSTING' (Slots) or 'REQUESTING' (Requests)

    // Layout views handles
    const navItems = document.querySelectorAll('.nav-item');
    const sidebarRecordBtn = document.getElementById('sidebar-record-btn');
    const viewContents = document.querySelectorAll('.view-content');
    const viewTitle = document.getElementById('current-view-title');

    // Authentication Handles
    const authOverlay = document.getElementById('auth-overlay');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');
    const gradYearSelect = document.getElementById('reg-grad-year');
    const statusBadge = document.getElementById('calculated-status-badge');
    const displayUsername = document.getElementById('display-username');
    const btnSystemLogout = document.getElementById('btn-system-logout');

    // Notifications DOM Handles
    const btnNotifToggle = document.getElementById('btn-notifications-toggle');
    const notifDropPanel = document.getElementById('notif-drop-panel');
    const notifBadgeCount = document.getElementById('notif-badge-count');
    const notifItemsContainer = document.getElementById('notif-items-container');
    const btnClearAlerts = document.getElementById('btn-clear-alerts');

    // Mock Interviews sub tabs handles
    const mockForm = document.getElementById('mock-marketplace-form');
    const subtabSlots = document.getElementById('subtab-slots');
    const subtabRequests = document.getElementById('subtab-requests');

    // Workflow record frames items references
    const btnTransmitAudio = document.getElementById('btn-transmit-audio');
    const btnDirectCommit = document.getElementById('btn-direct-commit');

    let mediaRecorder;
    let audioChunks = [];
    let audioBlob = null;
    let timerInterval;
    let secondsRecorded = 0;

    const btnRecord = document.getElementById('btn-record');
    const btnPause = document.getElementById('btn-pause');
    const btnReplay = document.getElementById('btn-replay');
    const recStatus = document.getElementById('recording-status');
    const recTimer = document.getElementById('recording-timer');
    const audioPlayback = document.getElementById('audio-playback');
    const entryContent = document.getElementById('entry-content');

    // --- AUTOMATED SESSION RESTORATION CONTEXT ---
    async function checkActiveSessionContext() {
        const activeSavedToken = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!activeSavedToken) {
            authOverlay.style.display = 'flex';
            return;
        }

        const formData = new FormData();
        formData.append('token', activeSavedToken);

        try {
            const response = await fetch('http://127.0.0.1:8000/api/verify-token', { method: 'POST', body: formData });
            if (!response.ok) throw new Error("Expired session trace marker.");
            const data = await response.json();
            
            currentSessionUser = data.user;
            displayUsername.textContent = `${currentSessionUser.name.toUpperCase()} [${currentSessionUser.status}]`;
            authOverlay.style.display = 'none';
            renderActivityStream(`SESSION_RESTORE // Active authorization verified via database token rows.`);
            
            // Seed initial data arrays
            refreshRepositoryData();
            refreshMockInterviewsBoard();
            startNotificationPollerLoop();
        } catch (err) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            authOverlay.style.display = 'flex';
        }
    }

    // --- RE-ARCHITECTED SINGLE PAGE APPLICATION (SPA) ROUTING LOGIC ---
    function routeActiveViewFrame(targetViewId, customTitleText) {
        // Clear out the active state classes across all navigation elements
        navItems.forEach(nav => nav.classList.remove('active'));
        sidebarRecordBtn.classList.remove('active');
        viewContents.forEach(view => view.classList.remove('active'));

        // Target display parameters assignments
        const matchingBtn = document.querySelector(`[data-target="${targetViewId}"]`);
        if (matchingBtn) matchingBtn.classList.add('active');
        
        document.getElementById(targetViewId).classList.add('active');
        viewTitle.textContent = customTitleText.toUpperCase();
    }

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-target');
            routeActiveViewFrame(id, `SYSTEM ${item.textContent}`);
        });
    });

    sidebarRecordBtn.addEventListener('click', () => {
        routeActiveViewFrame('record-view', 'CAPTURE DATA ENTRY MODE');
    });

    // --- FETCH ARCHIVE DATA CORE ENGINES ---
    async function refreshRepositoryData() {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/get-experiences');
            const data = await response.json();
            globalCachedExperiences = data.experiences;
            document.getElementById('total-exp-count').textContent = globalCachedExperiences.length;
            renderExperiencesArchives(globalCachedExperiences);
        } catch (err) { console.error("Data tracking failure:", err); }
    }

    function renderExperiencesArchives(recordsList, aiSynthesisNote = null) {
        const container = document.getElementById('records-list');
        if (!container) return;

        let html = "";
        if (aiSynthesisNote) {
            html += `
                <div class="archive-card RAG-synthesis-terminal-box" style="border: 2px solid #008800; background-color: #f0fdf4; margin-bottom: 25px;">
                    <div class="card-title-line" style="border-bottom-color: #008800;">
                        <span style="color: #008800;">[⚡] INSIDER NITT // SEMANTIC SYNTHESIS BRIEF</span>
                        <span class="badge" style="background: #008800;">AI INSIGHT</span>
                    </div>
                    <p style="font-size:0.85rem; font-weight: bold; color:#111; margin-top:10px; white-space: pre-wrap;">${aiSynthesisNote}</p>
                </div>
            `;
        }

        if (recordsList.length === 0) {
            container.innerHTML = html + `<p class="loading-text">NO MATCHES DISCOVERED INSIDE CORE CHANNELS.</p>`;
            return;
        }

        html += recordsList.map(item => `
            <div class="archive-card">
                <div class="card-title-line">
                    <span>${item.title.toUpperCase()}</span>
                    <span class="badge">${item.type.toUpperCase()}</span>
                </div>
                <div class="tech-tag-line">STACK/TAGS: [ ${item.tech.toUpperCase()} ]</div>
                <p style="font-size:0.8rem; color:#222; white-space: pre-wrap; margin-bottom:10px;">${item.content}</p>
                <div style="font-size: 0.65rem; color:#777; text-align:right;">CONTRIBUTED BY: ${item.author || "ANONYMOUS"}</div>
            </div>
        `).join('');
        container.innerHTML = html;
    }

    // --- REAL-TIME NOTIFICATION POLLING CONTEXT ---
    async function queryLivePipelineAlerts() {
        if (currentSessionUser.name === "GUEST") return;
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/get-notifications?username=${encodeURIComponent(currentSessionUser.name)}`);
            const data = await response.json();
            
            const count = data.notifications.length;
            if (count > 0) {
                notifBadgeCount.textContent = count;
                notifBadgeCount.style.display = 'flex';
                notifItemsContainer.innerHTML = data.notifications.map(n => `
                    <div class="alert-msg-card">${n.message}</div>
                `).join('');
            } else {
                notifBadgeCount.style.display = 'none';
                notifItemsContainer.innerHTML = `<div class="empty-notif-row">NO NEW ALERTS UNREAD INSIDE PIPELINE TRACKS.</div>`;
            }
        } catch (err) { console.error("Alerts query error:", err); }
    }

    function startNotificationPollerLoop() {
        queryLivePipelineAlerts();
        setInterval(queryLivePipelineAlerts, 6000);
    }

    btnNotifToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropPanel.classList.toggle('active');
    });

    document.addEventListener('click', () => notifDropPanel.classList.remove('active'));
    notifDropPanel.addEventListener('click', (e) => e.stopPropagation());

    btnClearAlerts.addEventListener('click', async () => {
        const formData = new FormData();
        formData.append('username', currentSessionUser.name);
        try {
            await fetch('http://127.0.0.1:8000/api/clear-notifications', { method: 'POST', body: formData });
            queryLivePipelineAlerts();
        } catch (err) { console.error("Failed to dismiss notifications entries:", err); }
    });

    // --- PERSISTENT MOCK INTERVIEWS WORKSPACE MANAGEMENT ENGINE ---
    async function refreshMockInterviewsBoard() {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/get-mocks');
            const data = await response.json();
            globalCachedMocks = data.mocks;
            
            // Real connection linkage update mapping counters directly
            document.getElementById('total-mock-count').textContent = data.accepted_count;
            renderMockBoardListings();
        } catch (err) { console.error("Mocks synchronization fault parameters:", err); }
    }

    function renderMockBoardListings() {
        const container = document.getElementById('market-listings-container');
        if (!container) return;

        // Filters matching the selected horizontal category sub tab
        const filtered = globalCachedMocks.filter(m => m.role_type === activeMockSubTab);

        if (filtered.length === 0) {
            container.innerHTML = `<p class="loading-text" style="padding:20px 0;">NO ACTIVE OPEN MATCHING POSTINGS LIVE ON FORUM.</p>`;
            return;
        }

        container.innerHTML = filtered.map(m => {
            const isSelfOwned = m.author_name.toUpperCase() === currentSessionUser.name.toUpperCase();
            const isOpen = m.status === 'OPEN';
            
            let actionBtnHtml = "";
            if (isOpen && !isSelfOwned) {
                actionBtnHtml = `<button class="brutalist-btn accept-action-btn" onclick="triggerMockPeerAcceptance(${m.id})" style="margin-top:10px; font-size:0.75rem; padding:6px 12px; background:#000; color:#fff;">ACCEPT & MESSAGE PEER</button>`;
            } else if (!isOpen) {
                actionBtnHtml = `<div style="font-size:0.7rem; color:#008800; font-weight:900; margin-top:8px;">[✔] LOCKED BY: ${m.accepted_by.toUpperCase()}</div>`;
            } else if (isSelfOwned && isOpen) {
                actionBtnHtml = `<div style="font-size:0.7rem; color:#666; font-style:italic; margin-top:8px;">AWAITING PEER CONNECTION...</div>`;
            }

            return `
                <div class="market-card" style="border-left: 4px solid ${m.role_type === 'HOSTING' ? '#008800' : '#ff0000'}">
                    <div class="card-title-line">
                        <span>${m.topic.toUpperCase()}</span>
                        <span class="badge ${m.role_type === 'REQUESTING' ? 'request-badge' : 'host-badge'}">${m.role_type}</span>
                    </div>
                    <div class="tech-tag-line" style="color:#111;">TIME WINDOW SLOT: ${m.time_window.toUpperCase()}</div>
                    <div style="font-size:0.65rem; color:#666;">POSTED BY OPERATOR: ${m.author_name.toUpperCase()}</div>
                    ${actionBtnHtml}
                </div>
            `;
        }).join('');
    }

    // Horizontal category tabs selection state changes
    subtabSlots.addEventListener('click', () => {
        subtabSlots.classList.add('active'); subtabRequests.classList.remove('active');
        activeMockSubTab = "HOSTING"; renderMockBoardListings();
    });

    subtabRequests.addEventListener('click', () => {
        subtabRequests.classList.add('active'); subtabSlots.classList.remove('active');
        activeMockSubTab = "REQUESTING"; renderMockBoardListings();
    });

    mockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('author_name', currentSessionUser.name);
        formData.append('role_type', document.getElementById('mock-role').value);
        formData.append('topic', document.getElementById('mock-topic').value);
        formData.append('time_window', document.getElementById('mock-time').value);

        try {
            const response = await fetch('http://127.0.0.1:8000/api/save-mock', { method: 'POST', body: formData });
            if (!response.ok) throw new Error("Broadcast request rejected.");
            
            renderActivityStream(`MOCK_BOARD_PUB // Posted scheduled criteria slot.`);
            mockForm.reset();
            refreshMockInterviewsBoard();
        } catch (err) { alert(`BROADCAST FAULT: ${err.message}`); }
    });

    // Accept and message popups action handler pipeline link
    window.triggerMockPeerAcceptance = async function(mockId) {
        const msgInput = prompt("ENTER PEER ALERTS CONNECTION MESSAGE:\nInput instructions or target contact coordinates (Discord, Mobile, Teams link):");
        if (msgInput === null) return; 
        if (msgInput.trim() === "") { alert("Message parameter context cannot remain empty lines."); return; }

        const formData = new FormData();
        formData.append('mock_id', mockId);
        formData.append('sender_name', currentSessionUser.name);
        formData.append('message', msgInput.trim());

        try {
            const response = await fetch('http://127.0.0.1:8000/api/accept-mock', { method: 'POST', body: formData });
            if (!response.ok) throw new Error("Rejection update response transaction sequence.");
            
            renderActivityStream(`MOCK_LOCK_COMMIT // Peer acceptance transaction logs locked down successfully.`);
            refreshMockInterviewsBoard();
        } catch (err) { alert(`TRANSACTION ERROR: ${err.message}`); }
    };

    // --- SEPARATE ACTION WORKFLOWS CAPTURE ENGINE LINK ---
    btnTransmitAudio.addEventListener('click', async () => {
        if (!audioBlob) return;

        btnTransmitAudio.setAttribute('disabled', 'true');
        btnTransmitAudio.textContent = "PROCESSING AUDIO STREAM IN AI PIPELINES...";
        entryContent.value = "Ingesting raw multi-part audio tracks...\nExecuting clean markdown conversion inference parameters...";

        const formData = new FormData();
        formData.append('audio_file', audioBlob, 'capture.webm');
        formData.append('entry_type', document.getElementById('entry-type').value);
        formData.append('entry_title', document.getElementById('entry-title').value);

        try {
            const response = await fetch('http://127.0.0.1:8000/api/process-audio', { method: 'POST', body: formData });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Server status code: ${response.status}`);
            }
            const data = await response.json();
            
            entryContent.value = data.processed_document;
            btnTransmitAudio.removeAttribute('disabled');
            btnTransmitAudio.textContent = "TRANSMIT & PROCESS AUDIO";
            renderActivityStream(`AI_TRANSCRIPTION_SUCCESS // Ingested background multi-modal context.`);
        } catch (err) {
            entryContent.value = `CRITICAL PIPELINE UNEXPECTED EXCEPTION:\n-> ${err.message}`;
            btnTransmitAudio.removeAttribute('disabled');
            btnTransmitAudio.textContent = "RE-TRANSMIT AUDIO";
        }
    });

    btnDirectCommit.addEventListener('click', async () => {
        const titleVal = document.getElementById('entry-title').value.trim();
        const contentVal = entryContent.value.trim();

        if (!titleVal || !contentVal) {
            alert("COMMIT ABORTED: Missing required document title configuration or blank text context parameters.");
            return;
        }

        btnDirectCommit.setAttribute('disabled', 'true');
        btnDirectCommit.textContent = "SYNCHRONIZING EMBEDDING VECTORS IN ARCHIVE...";

        const formData = new FormData();
        formData.append('author_name', currentSessionUser.name);
        formData.append('entry_type', document.getElementById('entry-type').value);
        formData.append('entry_title', titleVal);
        formData.append('content', contentVal);

        try {
            const response = await fetch('http://127.0.0.1:8000/api/save-experience', { method: 'POST', body: formData });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Server status code: ${response.status}`);
            }
            
            renderActivityStream(`DB_COMMIT // Local vector entry indexed under master ledger.`);
            
            document.getElementById('entry-title').value = "";
            entryContent.value = "";
            audioBlob = null;
            btnTransmitAudio.setAttribute('disabled', 'true');
            btnDirectCommit.removeAttribute('disabled');
            btnDirectCommit.textContent = "COMMIT TO REPOSITORY";
            btnRecord.innerHTML = '<span class="record-dot"></span> START RECORDING';
            recStatus.textContent = "IDLE";
            recTimer.textContent = "00:00";
            btnReplay.setAttribute('disabled', 'true');
            
            await refreshRepositoryData();
            routeActiveViewFrame('dashboard-view', 'SYSTEM DASHBOARD');
        } catch (err) {
            alert(`DB ARCHIVE FAULT:\n-> ${err.message}`);
            btnDirectCommit.removeAttribute('disabled');
            btnDirectCommit.textContent = "COMMIT TO REPOSITORY";
        }
    });

    // --- SEARCH BAR PIPELINE FILTERS CONTROL BAR ---
    const searchInput = document.getElementById('search-input');
    const filterTypeSelect = document.getElementById('filter-type-select');
    let searchDebounceTimeout;

    function triggerRagSearchExecution() {
        const queryText = searchInput.value.trim();
        const activeFilter = filterTypeSelect.value;

        if (queryText === "") {
            renderExperiencesArchives(globalCachedExperiences);
            return;
        }

        clearTimeout(searchDebounceTimeout);
        searchDebounceTimeout = setTimeout(async () => {
            renderActivityStream(`RAG_SEARCH_QUERY // Interrogating database indexes for: "${queryText}"`);
            
            const formData = new FormData();
            formData.append('query', queryText);
            formData.append('filter_type', activeFilter);

            try {
                const response = await fetch('http://127.0.0.1:8000/api/search-rag', { method: 'POST', body: formData });
                const data = await response.json();
                renderExperiencesArchives(data.results, data.ai_synthesis);
            } catch (err) { console.error("RAG tracking error:", err); }
        }, 400);
    }

    if (searchInput) searchInput.addEventListener('input', triggerRagSearchExecution);
    if (filterTypeSelect) filterTypeSelect.addEventListener('change', triggerRagSearchExecution);

    // --- FORM AUTH SWITCH CHECKS ---
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active'); tabRegister.classList.remove('active');
        loginForm.classList.add('active'); registerForm.classList.remove('active');
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active'); tabLogin.classList.remove('active');
        registerForm.classList.add('active'); loginForm.classList.remove('active');
    });

    gradYearSelect.addEventListener('change', (e) => {
        const year = parseInt(e.target.value);
        let status = "UNKNOWN";
        switch(year) {
            case 2030: status = "FRESHER"; break;
            case 2029: status = "SOPHOMORE"; break;
            case 2028: status = "PREFINAL YEAR"; break;
            case 2027: status = "FINAL YEAR"; break;
        }
        statusBadge.textContent = `STATUS: ${status}`;
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('email', document.getElementById('login-email').value);
        formData.append('password', document.getElementById('login-password').value);

        try {
            const response = await fetch('http://127.0.0.1:8000/api/login', { method: 'POST', body: formData });
            if (!response.ok) { const errD = await response.json(); throw new Error(errD.detail || "Access Denied."); }
            const data = await response.json();
            
            localStorage.setItem(SESSION_STORAGE_KEY, data.token);
            currentSessionUser = data.user;
            displayUsername.textContent = `${currentSessionUser.name.toUpperCase()} [${currentSessionUser.status}]`;
            authOverlay.style.display = 'none';
            renderActivityStream(`AUTH_SUCCESS // Token persistent issued context lines initialization.`);
            
            refreshRepositoryData();
            refreshMockInterviewsBoard();
            startNotificationPollerLoop();
        } catch (err) { alert(`ACCESS DENIED: ${err.message}`); }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', document.getElementById('reg-name').value);
        formData.append('email', document.getElementById('reg-email').value);
        formData.append('password', document.getElementById('reg-password').value);
        formData.append('grad_year', gradYearSelect.value);

        try {
            const response = await fetch('http://127.0.0.1:8000/api/register', { method: 'POST', body: formData });
            if (!response.ok) { const errD = await response.json(); throw new Error(errD.detail || "Fail."); }
            const data = await response.json();
            
            localStorage.setItem(SESSION_STORAGE_KEY, data.token);
            currentSessionUser = data.user;
            displayUsername.textContent = `${currentSessionUser.name.toUpperCase()} [${currentSessionUser.status}]`;
            authOverlay.style.display = 'none';
            renderActivityStream(`REGISTRATION_COMMIT // Authorized identity storage assigned successfully.`);
            
            refreshRepositoryData();
            refreshMockInterviewsBoard();
            startNotificationPollerLoop();
        } catch (err) { alert(`REGISTRATION REJECTED: ${err.message}`); }
    });

    btnSystemLogout.addEventListener('click', () => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        window.location.reload();
    });

    // --- MIC HARDWARE CONTROLLER LOGIC ---
    btnRecord.addEventListener('click', async () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') { mediaRecorder.stop(); return; }
        audioChunks = [];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                clearInterval(timerInterval);
                audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioPlayback.src = URL.createObjectURL(audioBlob);
                recStatus.textContent = "FINISHED RECORDING";
                recStatus.style.color = "#000000";
                btnRecord.innerHTML = '<span class="record-dot"></span> RE-RECORD';
                btnPause.setAttribute('disabled', 'true');
                btnReplay.removeAttribute('disabled');
                btnTransmitAudio.removeAttribute('disabled');
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
            secondsRecorded = 0;
            timerInterval = setInterval(() => {
                secondsRecorded++;
                recTimer.textContent = `${String(Math.floor(secondsRecorded / 60)).padStart(2, '0')}:${String(secondsRecorded % 60).padStart(2, '0')}`;
            }, 1000);
            recStatus.textContent = "LIVE RECORDING"; recStatus.style.color = "#ff0000";
            btnRecord.innerHTML = '■ STOP'; btnPause.removeAttribute('disabled');
            btnPause.textContent = "PAUSE"; btnReplay.setAttribute('disabled', 'true');
            btnTransmitAudio.setAttribute('disabled', 'true');
        } catch (err) { alert("Microphone hardware channel error."); }
    });

    btnPause.addEventListener('click', () => {
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.pause(); clearInterval(timerInterval);
            recStatus.textContent = "RECORDING PAUSED"; recStatus.style.color = "#666666"; btnPause.textContent = "RESUME";
        } else if (mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            timerInterval = setInterval(() => { secondsRecorded++; recTimer.textContent = `${String(Math.floor(secondsRecorded / 60)).padStart(2, '0')}:${String(secondsRecorded % 60).padStart(2, '0')}`; }, 1000);
            recStatus.textContent = "LIVE RECORDING"; recStatus.style.color = "#ff0000"; btnPause.textContent = "PAUSE";
        }
    });

    btnReplay.addEventListener('click', () => audioPlayback.play());

    function renderActivityStream(msg) {
        const container = document.getElementById('activity-log');
        if (!container) return;
        if (container.querySelector('.loading-text')) container.innerHTML = "";
        container.innerHTML = `<div class="log-entry">&gt; [${new Date().toLocaleTimeString()}] ${msg}</div>` + container.innerHTML;
    }

    // Initialize checking process loop blocks
    renderActivityStream("SYS_INIT // Core Repository Engine awaiting operator validation authorization trails.");
    checkActiveSessionContext();
});