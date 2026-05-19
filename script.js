// ==========================================
// 1. DATABASE CONFIGURATION & INITIALIZATION
// ==========================================
const supabaseUrl = 'https://ionwyohuqszattwbrskr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlvbnd5b2h1cXN6YXR0d2Jyc2tyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTAyMTQxNiwiZXhwIjoyMDk0NTk3NDE2fQ.uiOjWCkeJyN-7x9fAOwFoTSWN648pUWGijSTR9THhCo';

let dbClient;
let globalLogsCache = [];
let masterParticipantsMap = {}; 

try {
    if (window.supabase) {
        dbClient = window.supabase.createClient(supabaseUrl, supabaseKey);
        console.log("Supabase client initialized successfully.");
    } else {
        alert("CRITICAL ERROR: Supabase library script link is missing or blocked in your HTML file!");
    }
} catch (e) {
    console.error("Initialization failed:", e);
}

// SIMULATION DATE CONTROL =================================>>>>>>>>>>>>>>>>>>>>>>

const EVENT_START_DATE = new Date("2026-05-17"); 
let currentFilter = 'all'; 


// 2. CALENDAR ENGINE
function getCurrentEventDayNumber() {
    const today = new Date();
    const start = new Date(new Date(EVENT_START_DATE).setHours(0, 0, 0, 0));
    const current = new Date(today.setHours(0, 0, 0, 0));
    const diffDays = Math.floor((current - start) / (1000 * 60 * 60 * 24)) + 1;
    return (diffDays >= 1 && diffDays <= 3) ? diffDays : 1;
}

// 3. LIVE DATABASE LOGIC & OPERATIONS
async function fetchAndRenderDashboard() {
    if (!dbClient) return;

    console.log("Fetching logs matching explicit schema columns...");
    
    // 1. Fetch names matching whatever column key links your participants master table
    const { data: profiles, error: profileError } = await dbClient
        .from('participants')
        .select('id, full_name'); // Uses 'id' to map to 'participant_id' log rows

    if (profiles) {
        profiles.forEach(p => {
            if (p.id) masterParticipantsMap[p.id] = p.full_name;
        });
    }

    // 2. Fetch log rows tracking exactly against your structural keys
    const { data: logs, error: logError } = await dbClient
        .from('attendance_logs')
        .select('id, participant_id, event_day, action, scan_time')
        .order('scan_time', { ascending: false });

    if (logError) {
        alert("Database Fetch Error: " + logError.message);
        return;
    }

    globalLogsCache = logs || [];
    applyLocalFiltersAndRender();
}

function applyLocalFiltersAndRender() {
    const tableBody = document.getElementById('log-table-body');
    if (!tableBody) return;

    const searchQuery = document.getElementById('search-input')?.value.toLowerCase().trim() || "";
    tableBody.innerHTML = ''; 

    const filtered = globalLogsCache.filter(log => {
        let matchesDay = true;
        if (currentFilter !== 'all') {
            const targetDayNum = parseInt(currentFilter.replace('Day ', ''), 10);
            matchesDay = (log.event_day === targetDayNum);
        }
        
        const uuidString = (log.participant_id || "").toLowerCase();
        const resolvedName = masterParticipantsMap[log.participant_id] || "Unknown Participant";
        const matchesSearch = !searchQuery || uuidString.includes(searchQuery) || resolvedName.toLowerCase().includes(searchQuery);

        return matchesDay && matchesSearch;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="empty-table-placeholder">— No Entry Yet —</td></tr>`;
        return;
    }

    filtered.forEach(log => {
        const participantName = masterParticipantsMap[log.participant_id] || "Unknown Participant";
        const timeFormatted = log.scan_time ? new Date(log.scan_time).toLocaleTimeString() : "- : - : -";
        
        let statusToggleHTML = '';
        if (log.action === 'CHECK_IN') {
            statusToggleHTML = `<button class="campus-toggle-btn marker-in" onclick="toggleParticipantStatus(event, ${log.id}, 'CHECK_OUT')"><span class="marker-icon">✓</span> IN</button>`;
        } else {
            statusToggleHTML = `<button class="campus-toggle-btn marker-out" onclick="toggleParticipantStatus(event, ${log.id}, 'CHECK_IN')"><span class="marker-icon">✕</span> OUT</button>`;
        }

        const rowHTML = `
            <tr onclick="openParticipantDrawer('${log.participant_id}')" style="cursor: pointer;">
                <td><strong>${log.participant_id ? log.participant_id.substring(0,8): 'N/A'}</strong></td>
                <td>${participantName}</td>
                <td>${log.action === 'CHECK_IN' ? timeFormatted : '- : - : -'}</td>
                <td>${log.action === 'CHECK_OUT' ? timeFormatted : '- : - : -'}</td>
                <td>Day ${log.event_day || 1}</td>
                <td>${statusToggleHTML}</td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', rowHTML);
    });
}

async function toggleParticipantStatus(event, logId, nextActionState) {
    event.stopPropagation(); 
    if (!dbClient) return;

    const { error } = await dbClient
        .from('attendance_logs')
        .update({ 
            action: nextActionState,
            scan_time: new Date().toISOString()
        })
        .eq('id', logId);

    if (error) {
        alert("Status update failed: " + error.message);
    } else {
        fetchAndRenderDashboard();
    }
}

async function checkInParticipant(participantUuid) {
    if (!dbClient || !participantUuid.trim()) return;

    const targetDayNumber = getCurrentEventDayNumber(); 

    // Verify profile exists using the UUID lookup key
    const { data: participant, error: profileError } = await dbClient
        .from('participants')
        .select('*')
        .eq('id', participantUuid)
        .maybeSingle();

    if (profileError || !participant) {
        alert(`❌ Access Denied: User UUID '${participantUuid}' not found in registration catalog!`);
        return;
    }

    // Lookup running log states
    const { data: activeLog, error: logError } = await dbClient
        .from('attendance_logs')
        .select('*')
        .eq('participant_id', participantUuid)
        .eq('event_day', targetDayNumber)
        .eq('action', 'CHECK_IN')
        .maybeSingle();

    if (activeLog) {
        const { error: updateError } = await dbClient
            .from('attendance_logs')
            .update({ 
                action: 'CHECK_OUT',
                scan_time: new Date().toISOString()
            })
            .eq('id', activeLog.id);

        if (updateError) {
            alert("Checkout processing failed: " + updateError.message);
        } else {
            alert(`✕ Checked Out: Goodbye, ${participant.full_name || 'User'}!`);
            fetchAndRenderDashboard();
        }
        return;
    }

    // Inserts matches your database layout properties exactly
    const { error: insertError } = await dbClient
        .from('attendance_logs')
        .insert([{
            participant_id: participantUuid,
            event_day: targetDayNumber,
            action: 'CHECK_IN',
            scan_time: new Date().toISOString()
        }]);

    if (insertError) {
        alert("Database transaction failed: " + insertError.message);
    } else {
        alert(`✅ Approved: Welcome to Day ${targetDayNumber}, ${participant.full_name || 'User'}!`);
        fetchAndRenderDashboard(); 
    }
}

// ==========================================
// 4. DRAWER VISUAL UI FUNCTIONS
// ==========================================
async function openParticipantDrawer(participantUuid) {
    if (!dbClient) return;

    const { data: p, error } = await dbClient
        .from('participants')
        .select('*')
        .eq('id', participantUuid)
        .maybeSingle();

    if (error || !p) return;

    document.getElementById('drawer-name').innerText = p.full_name || 'N/A';
    document.getElementById('drawer-id').innerText = p.id || 'N/A';
    document.getElementById('drawer-email').innerText = p.email || 'N/A';
    document.getElementById('drawer-college').innerText = p.college_name || 'N/A';
    document.getElementById('drawer-phone').innerText = p.phone || 'N/A';
    document.getElementById('drawer-category').innerText = 'Participant';

    document.getElementById('detail-drawer').classList.add('open');
}

function closeDetailDrawer(event) {
    if (event === false || event.target.classList.contains('drawer-overlay') || event.target.classList.contains('close-drawer-btn')) {
        document.getElementById('detail-drawer').classList.remove('open');
    }
}

// ==========================================
// 5. INTUITIVE EVENT INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderDashboard();

    const searchBar = document.getElementById('search-input');
    if (searchBar) {
        searchBar.addEventListener('input', applyLocalFiltersAndRender);
    }

    const dayButtons = document.querySelectorAll('.day-btn');
    dayButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            dayButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.getAttribute('data-day');
            applyLocalFiltersAndRender();
        });
    });
});
