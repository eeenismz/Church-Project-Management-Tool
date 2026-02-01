import { db } from './firebase-config.js';
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const projectId = params.get('id');

if (!projectId) {
    window.location.replace('admin.html');
    throw new Error('Redirecting to admin'); // Stop execution
}

const loadingView = document.getElementById('loading');
const errorView = document.getElementById('error-view');
const projectView = document.getElementById('project-view');

// UI Elements
const els = {
    cover: document.getElementById('p-cover'),
    title: document.getElementById('p-title'),
    dates: document.getElementById('date-range'),
    percent: document.getElementById('p-percent'),
    bar: document.getElementById('p-progress-bar'),
    goal: document.getElementById('p-goal'),
    current: document.getElementById('p-current-amount'),
    bank: document.getElementById('p-bank-details'),
    qrContainer: document.getElementById('p-qr-container'),
    qrImg: document.getElementById('p-qr-img'),
    history: document.getElementById('history-list')
};

async function loadProject() {
    if (!projectId) {
        showError();
        return;
    }

    try {
        const docRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            renderProject(docSnap.data());
        } else {
            console.log("No such document!");
            showError();
        }
    } catch (error) {
        console.error("Error getting document:", error);
        showError();
    }
}

function renderProject(data) {
    // 1. Set Theme Color
    document.documentElement.style.setProperty('--primary-color', data.color || '#6366f1');
    document.documentElement.style.setProperty('--primary-light', adjustColor(data.color, 40) || '#818cf8');

    // 2. Basic Info
    els.title.textContent = data.name;
    els.dates.textContent = `${formatDate(data.startDate)} - ${data.endDate ? formatDate(data.endDate) : 'Ongoing'}`;
    
    // 3. Cover Image
    if (data.image) {
        els.cover.style.backgroundImage = `url(${data.image})`;
    }

    // 4. Financials
    const goal = parseFloat(data.targetAmount) || 0;
    const current = parseFloat(data.currentAmount) || 0;
    
    // Need formatter
    const fmt = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
    
    els.current.textContent = fmt.format(current);
    
    if (data.type === 'open' || goal === 0) {
        els.goal.textContent = "Open Goal";
        els.percent.textContent = "∞";
        els.bar.style.width = "100%";
    } else {
        els.goal.textContent = fmt.format(goal);
        const percent = Math.min(100, Math.round((current / goal) * 100));
        els.percent.textContent = `${percent}%`;
        els.bar.style.width = `${percent}%`;
    }

    // 5. Payment
    els.bank.textContent = data.bankDetails || "Contact Admin for details";
    if (data.qrCode) {
        els.qrContainer.style.display = 'block';
        els.qrImg.src = data.qrCode;
    }

    // 6. History
    // TODO: We will implement history fetching from subcollection or array later
    // For now we just show the static "started"
    
    showProject();
}

function formatDate(dateStr) {
    if(!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Lighten color helper (simple version)
function adjustColor(color, amount) {
    return color; // Todo: implement actual hex manipulation if needed, or just rely on transparency
}

function showError() {
    loadingView.style.display = 'none';
    errorView.style.display = 'flex';
}

function showProject() {
    loadingView.style.display = 'none';
    projectView.style.display = 'block';
}

loadProject();
