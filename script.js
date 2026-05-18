// ==========================================
// 1. CONFIGURATION & SIMULATION ENGINE
// ==========================================

const EVENT_START_DATE = new Date("2026-05-17"); 


function getCurrentEventDay() {
    const today = new Date();
    
    // Create a safe clone instance to prevent modifying the global constant object reference
    const startDateClone = new Date(EVENT_START_DATE.getTime());
    
    // Clear time factors for an accurate day-to-day calendar difference calculation
    const start = new Date(startDateClone.setHours(0, 0, 0, 0));
    const current = new Date(today.setHours(0, 0, 0, 0));
    
    // Calculate difference in days
    const diffTime = current - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (diffDays === 1) return "Day 1";
    if (diffDays === 2) return "Day 2";
    if (diffDays === 3) return "Day 3";
    
    // Fallback safely for local sandbox testing outside your scheduled live run window
    return "Day 1"; 
}

// Pre-registered pool used for mock simulations
const participantPool = [
    { name: "Bumrah" },
    { name: "Ishaan" },
    { name: "Dravid" },
    { name: "Pandya" },
    { name: "Gambhir" },
    { name: "Sachin" }
];

// Active log records (Historical records from earlier days remain completely safe)
let activeLogs = [
    { id: "QR-9081", name: "Dhoni", inTime: "09:30:15 AM", outTime: " - : - : - ", day: "Day 1", status: "In" },
    { id: "QR-4412", name: "Virat", inTime: "10:15:30 AM", outTime: "05:45:12 PM", day: "Day 1", status: "Out" }
];

let currentFilter = 'all';

// ==========================================
// 2. MAIN LOGIC: RENDER DASHBOARD TABLE
// ==========================================

function renderTable() {
    const tableBody = document.getElementById("log-table-body");
    const searchInput = document.getElementById("search-input");
    
    // Extract search query
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : "";
    
    tableBody.innerHTML = "";

    // Filter rows based on BOTH the active Day Button AND the Search Input text
    const filteredLogs = activeLogs.filter(log => {
        const matchesDay = (currentFilter === 'all' || log.day === currentFilter);
        const matchesSearch = log.id.toLowerCase().includes(searchQuery) || 
                              log.name.toLowerCase().includes(searchQuery);

        return matchesDay && matchesSearch;
    });

    // Custom warning message if no results match
    if (filteredLogs.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ff330f; padding: 20px; font-weight: bold;">!!No matching scans found!!</td></tr>`;
        return;
    }

    // Build the updated rows dynamically with separate In/Out times and Status Switch
    filteredLogs.forEach((log) => {
        // Determine active styling based on current state
        const statusClass = log.status === "In" ? "marker-in" : "marker-out";
        const statusIcon = log.status === "In" ? "✓" : "O";
        const statusText = log.status === "In" ? "In" : "Out";

        const row = `
            <tr>
                <td><strong>${log.id}</strong></td>
                <td>${log.name}</td>
                <td style="color: var(--accent-green); font-weight: 500;">${log.inTime}</td>
                <td style="color: ${log.outTime === ' - : - : - ' ? '#718096' : 'var(--primary)'}; font-weight: 500;">${log.outTime}</td>
                <td style="color: #e2e8f0; font-weight: 600;">${log.day}</td>
                <td>
                    <button class="campus-toggle-btn ${statusClass}" onclick="toggleParticipantStatus('${log.id}')">
                        <span class="marker-icon">${statusIcon}</span> ${statusText}
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// ==========================================
// 3. INTERACTIVE ACTIONS & HANDLERS
// ==========================================

function handleIncomingQRScan(scannedId, scannedName) {
    if (!scannedId || !scannedName) return;

    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Determine the current running day automatically via calendar date tracking
    const computedCurrentDay = getCurrentEventDay();

    // Check if the participant already scanned into the system *today*
    const existingEntryToday = activeLogs.find(log => log.id === scannedId && log.day === computedCurrentDay);

    if (existingEntryToday) {
        // SECOND SCAN TODAY: Update exit timestamp and flip their active status to out
        existingEntryToday.outTime = timestamp; 
        existingEntryToday.status = "Out";
    } else {
        // FIRST SCAN TODAY: Add a brand new history entry locked to today's event day number
        const newScanEntry = {
            id: scannedId,
            name: scannedName,
            inTime: timestamp,
            outTime: " - : - : - ",
            day: computedCurrentDay, // Securely logged under the live auto day
            status: "In"
        };
        activeLogs.unshift(newScanEntry); 
    }

    renderTable();
}

// Manual Status Click Switch Override Handler
function toggleParticipantStatus(id) {
    const participant = activeLogs.find(log => log.id === id);
    if (participant) {
        if (participant.status === "In") {
            participant.status = "Out";
            // If they are manually toggled to out and have no outTime record yet, apply a current timestamp
            if (participant.outTime === " - : - : - ") {
                const now = new Date();
                participant.outTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }
        } else {
            participant.status = "In";
        }
        renderTable();
    }
}

// Upper Utility Tab Section Event Filters
function setupDayFilters() {
    const buttons = document.querySelectorAll(".day-btn");
    buttons.forEach(button => {
        button.addEventListener("click", () => {
            buttons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");
            currentFilter = button.getAttribute("data-day");
            renderTable();
        });
    });
}

function setupSearchFilter() {
    const searchInput = document.getElementById("search-input");
    if (!searchInput) return;
    searchInput.addEventListener("input", () => { renderTable(); });
}

/* Simulates real behavior using auto-day assignment */
/* Simulates real-world multi-day scanning behavior safely */
function setupSimulationButton() {
    const simulateBtn = document.getElementById("simulate-scan-btn");
    if (!simulateBtn) return;

    simulateBtn.addEventListener("click", () => {
        // 1. Pick a random person from the pre-registered pool
        const randomPerson = participantPool[Math.floor(Math.random() * participantPool.length)];
        
        // 2. Find out what day the automated system clock is currently running on
        const computedCurrentDay = getCurrentEventDay();
        
        // 3. Look for an existing log for this person ONLY within TODAY's specific day track
        const matchingLogToday = activeLogs.find(log => log.name === randomPerson.name && log.day === computedCurrentDay);
        
        if (matchingLogToday) {
            // If they already scanned IN today, this second scan checks them OUT for today
            handleIncomingQRScan(matchingLogToday.id, matchingLogToday.name);
        } else {
            // If they haven't scanned yet TODAY, treat them as a brand new entry for today.
            // Even if they have a log under "Day 1", this generates a fresh, separate row for Day 2/Day 3.
            const generatedId = "QR-" + Math.floor(1234 + Math.random() * 5678);
            handleIncomingQRScan(generatedId, randomPerson.name);
        }
    });
}


function setupResetButton() {
    const resetBtn = document.getElementById("reset-time-btn");
    if (!resetBtn) return;

    resetBtn.addEventListener("click", () => {
        const confirmReset = confirm("THIS WILL DELETE IN / OUT TIME OF EVERY PARTICIPANT");
        
        if (confirmReset) {
            activeLogs.forEach(log => {
                log.inTime = " - : - : - ";
                log.outTime = " - : - : - ";
            });
            renderTable();
        }
    });
}

// ==========================================
// 4. MAIN LIFECYCLE RUNTIME INITIALIZATION
// ==========================================
window.onload = () => {
    renderTable();
    setupDayFilters();
    setupSearchFilter();
    setupSimulationButton();
    setupResetButton();
};
