// ==========================================
// 1. DUMMY DATA POOLS & SIMULATION ENGINE
// ==========================================

// Pre-registered pool with cricket legends
const participantPool = [
    { name: "Bumrah", day: "Day 1", campusStatus: "in" },
    { name: "Ishaan", day: "Day 1", campusStatus: "out" },
    { name: "Dravid", day: "Day 2", campusStatus: "out" },
    { name: "Pandya", day: "Day 2", campusStatus: "in" },
    { name: "Gambhir", day: "Day 3", campusStatus: "out" },
    { name: "Sachin", day: "Day 3", campusStatus: "in" }
];

// Active dummy log records loaded on startup
let activeLogs = [
    { id: "QR-9081", name: "Dhoni", time: "09:30:15 AM", day: "Day 1", status: "verified", campusStatus: "in" },
    { id: "QR-4412", name: "Virat", time: "10:15:30 AM", day: "Day 1", status: "verified", campusStatus: "out" }
];

let currentFilter = 'all';


// ==========================================
// 2. MAIN LOGIC: RENDER DASHBOARD TABLE
// ==========================================

function renderTable() {
    const tableBody = document.getElementById("log-table-body");
    const searchInput = document.getElementById("search-input");
    
    //extract search query
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

    // Build the 6-column rows dynamically
    filteredLogs.forEach((log) => {
        const markerClass = log.campusStatus === "in" ? "marker-in" : "marker-out";
        const markerSymbol = log.campusStatus === "in" ? "✓" : "✗";
        const markerText = log.campusStatus === "in" ? "In" : "Left";

        //We pass the unique log.id string directly to avoid index shifting bugs
        const row = `
            <tr>
                <td><strong>${log.id}</strong></td>
                <td>${log.name}</td>
                <td>${log.time}</td>
                <td>${log.day}</td>
                <td><span class="status-badge ${log.status}">${log.status.toUpperCase()}</span></td>
                <td>
                    <button class="campus-toggle-btn ${markerClass}" onclick="toggleCampusStatus('${log.id}')">
                        <span class="marker-icon">${markerSymbol}</span> ${markerText}
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

function handleIncomingQRScan(scannedId, scannedName, assignedDay) {
    if (!scannedId || !scannedName || !assignedDay) return;

    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    //Checks if unique QR ID has already scanned
    const existingEntry = activeLogs.find(log => log.id === scannedId);

    if (existingEntry) {
        //RE-SCAN DETECTED: Automatically flip their status between In and Left
        existingEntry.campusStatus = (existingEntry.campusStatus === "in") ? "out" : "in";
        existingEntry.time = timestamp; //Update latest timestamp
    } else {
        //NEW ENTRY DETECTED: Add a fresh row at default at "in"
        const newScanEntry = {
            id: scannedId,
            name: scannedName,
            time: timestamp,
            day: assignedDay,
            status: "verified",
            campusStatus: "in" 
        };
        activeLogs.unshift(newScanEntry); 
    }

    renderTable();
}

// Manual button override handler
function toggleCampusStatus(id) {
    const person = activeLogs.find(log => log.id === id);
    if (person) {
        person.campusStatus = (person.campusStatus === "in") ? "out" : "in";
    }
    renderTable();
}

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

/* Simulates real behavior*/
function setupSimulationButton() {
    const simulateBtn = document.getElementById("simulate-scan-btn");
    if (!simulateBtn) return;

    simulateBtn.addEventListener("click", () => {

        const randomPerson = participantPool[Math.floor(Math.random() * participantPool.length)];
        
        const matchingLog = activeLogs.find(log => log.name === randomPerson.name);
        
        if (matchingLog) 
            {
            handleIncomingQRScan(matchingLog.id, matchingLog.name, matchingLog.day);
        } 
        else 
            {
            const generatedId = "QR-" + Math.floor(1234 + Math.random() * 5678);
            handleIncomingQRScan(generatedId, randomPerson.name, randomPerson.day);
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
};
