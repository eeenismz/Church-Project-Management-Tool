import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, getDocs, doc, updateDoc, Timestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM Elements
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const userEmailSpan = document.getElementById('user-email');

// Modal Elements
const modal = document.getElementById('project-modal');
const addProjectBtn = document.getElementById('add-project-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const projectForm = document.getElementById('project-form');

// --- state ---
let currentUser = null;

// --- Auth Listener ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        userEmailSpan.textContent = user.email;
        showDashboard();
        fetchProjects();
    } else {
        currentUser = null;
        showLogin();
    }
});

// --- View Toggling ---
function showDashboard() {
    loginView.style.display = 'none';
    dashboardView.style.display = 'block';
    document.body.style.alignItems = 'flex-start';
}

function showLogin() {
    loginView.style.display = 'block';
    dashboardView.style.display = 'none';
    document.body.classList.add('flex-center');
}

// --- Auth Actions ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert("Login failed: " + error.message);
    }
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// --- Modal Actions ---
function openModal() {
    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
    projectForm.reset();
    resetPreviews();
}

function resetPreviews() {
    document.getElementById('image-preview').style.backgroundImage = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('qr-preview').style.backgroundImage = '';
    document.getElementById('qr-preview').style.display = 'none';
}

addProjectBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);

// Close modal if clicking outside
window.addEventListener('click', (e) => {
    if (e.target == modal) {
        closeModal();
    }
});

// --- Image Handling helper (Preview) ---
const handleImagePreview = (inputId, previewId, hiddenInputId) => {
    document.getElementById(inputId).addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById(previewId);
                preview.style.backgroundImage = `url(${e.target.result})`;
                preview.style.display = 'block';
                // TODO: Here we will add compression logic later
                // For now, raw base64 mapping (careful with size)
                // We'll implement the resize/compress function next
            }
            reader.readAsDataURL(file);
        }
    });
};

// --- Logic: Save Project ---
// --- Logic: Save Project ---
// --- Money Formatting Logic ---
const moneyInputs = document.querySelectorAll('.money-input');
moneyInputs.forEach(input => {
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/,/g, '').replace(/[^0-9.]/g, ''); // Strip non-numeric
        if (value) {
            e.target.value = Number(value).toLocaleString('en-US');
        } else {
             e.target.value = '';
        }
    });
});

function getCleanNumber(inputId) {
    const val = document.getElementById(inputId).value;
    return Number(val.replace(/,/g, ''));
}

// --- Logic: Save Project ---
projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = projectForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = "Saving...";
    submitBtn.disabled = true;

    try {
        const id = document.getElementById('project-id').value;
        const name = document.getElementById('p-name').value;
        const type = document.getElementById('p-type').value;
        const color = document.getElementById('p-color').value;
        const target = getCleanNumber('p-target'); // Use helper
        const current = getCleanNumber('p-current'); // Use helper
        const start = document.getElementById('p-start').value;
        const end = document.getElementById('p-end').value;
        const bank = document.getElementById('p-bank-name').value;
        
        // Image Processing
        const imageFile = document.getElementById('p-image-file').files[0];
        const qrFile = document.getElementById('p-qr-file').files[0];
        
        // Handle images
        let imageBase64 = document.getElementById('p-image-base64').value; 
        let qrBase64 = document.getElementById('p-qr-base64').value;

        if (imageFile) {
            imageBase64 = await resizeAndCompressImage(imageFile);
        }
        if (qrFile) {
            qrBase64 = await resizeAndCompressImage(qrFile, 400); 
        }

        const projectData = {
            name, type, color, targetAmount: target, currentAmount: current,
            startDate: start, endDate: end, bankDetails: bank,
            image: imageBase64, qrCode: qrBase64,
            updatedAt: Timestamp.now()
        };

        if (id) {
            const oldDocRef = doc(db, "projects", id);
            const oldDocSnap = await getDoc(oldDocRef);
            
            if (oldDocSnap.exists()) {
                const oldData = oldDocSnap.data();
                const oldAmount = Number(oldData.currentAmount || 0);
                
                if (current !== oldAmount) {
                    const diff = current - oldAmount;
                    await addDoc(collection(db, "projects", id, "history"), {
                        amount: diff,
                        newTotal: current,
                        timestamp: Timestamp.now(),
                        note: "Admin Update"
                    });
                }
            }
            await updateDoc(doc(db, "projects", id), projectData);
        } else {
            projectData.createdAt = Timestamp.now();
            const docRef = await addDoc(collection(db, "projects"), projectData);
            
            if (current > 0) {
                 await addDoc(collection(db, "projects", docRef.id, "history"), {
                    amount: current,
                    newTotal: current,
                    timestamp: Timestamp.now(),
                    note: "Initial Amount"
                });
            }
        }

        closeModal();
        fetchProjects(); 

    } catch (error) {
        console.error("Error saving project: ", error);
        alert("Error saving: " + error.message);
    } finally {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
    }
});

// --- Logic: Image Compression ---
function resizeAndCompressImage(file, maxWidth = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG at 0.7 quality
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

// --- Logic: Fetch Projects ---
async function fetchProjects() {
    const grid = document.getElementById('projects-grid');
    grid.innerHTML = '<div class="glass-card flex-center"><p>Loading...</p></div>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "projects"));
        grid.innerHTML = '';
        
        if (querySnapshot.empty) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No projects found. Create one!</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const card = document.createElement('div');
            card.className = 'glass-card';
            card.style.borderTop = `4px solid ${data.color}`;
            
            const percent = data.targetAmount > 0 
                ? Math.min(100, Math.round((data.currentAmount / data.targetAmount) * 100)) 
                : 100;
            
            // Format money for display
            const fmt = new Intl.NumberFormat('th-TH');

            card.innerHTML = `
                <div style="height: 120px; background-image: url('${data.image || ''}'); background-size: cover; background-position: center; border-radius: var(--radius-sm); margin-bottom: 1rem; background-color: #eee;"></div>
                <h4>${data.name}</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                    ${data.type === 'open' ? 'Open Donation' : 'Target: ' + fmt.format(data.targetAmount)}
                </p>
                
                <div class="progress-container" style="height: 6px; margin: 0.5rem 0;">
                    <div class="progress-bar" style="width: ${percent}%; background-color: ${data.color};"></div>
                </div>
                <div class="flex-between" style="font-size: 0.9rem;">
                    <span>Raised: ${fmt.format(data.currentAmount)}</span>
                    <span style="color: ${data.color}; font-weight: bold;">${percent}%</span>
                </div>

                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <button class="btn btn-outline btn-sm" onclick="window.editProject('${doc.id}')" style="flex: 1;">Edit / Update</button>
                    <a href="index.html?id=${doc.id}" target="_blank" class="btn btn-primary btn-sm" style="flex: 1; background-color: ${data.color}; border: none;">View</a>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching projects:", error);
        grid.innerHTML = '<p>Error loading projects.</p>';
    }
}

// Make edit function global
// Make edit function global
window.editProject = async (id) => {
    try {
        const docRef = doc(db, "projects", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Populate form
            document.getElementById('project-id').value = id;
            document.getElementById('p-name').value = data.name;
            document.getElementById('p-type').value = data.type;
            document.getElementById('p-color').value = data.color;
            // Format existing numbers with commas
            // Use fallback to 0 if NaN, though data should be valid
            document.getElementById('p-target').value = (Number(data.targetAmount) || 0).toLocaleString('en-US');
            document.getElementById('p-current').value = (Number(data.currentAmount) || 0).toLocaleString('en-US');
            
            document.getElementById('p-start').value = data.startDate;
            document.getElementById('p-end').value = data.endDate;
            document.getElementById('p-bank-name').value = data.bankDetails || '';
            
            document.getElementById('p-image-base64').value = data.image || '';
            document.getElementById('p-qr-base64').value = data.qrCode || '';

            document.getElementById('modal-title').textContent = "Update Project / Funds";

            if (data.image) {
                const p = document.getElementById('image-preview');
                p.style.backgroundImage = `url(${data.image})`;
                p.style.display = 'block';
            }
            if (data.qrCode) {
                 const p = document.getElementById('qr-preview');
                p.style.backgroundImage = `url(${data.qrCode})`;
                p.style.display = 'block';
            }
            
            // Allow time for modal to render before fetching history if needed
            const logContainer = document.getElementById('activity-log-container');
            if (logContainer) logContainer.innerHTML = '<p style="color:var(--text-muted);">Loading history...</p>';
            
            openModal();
            fetchHistory(id);

        }
    } catch (error) {
        console.error("Error getting document:", error);
    }
};

async function fetchHistory(projectId) {
    const logContainer = document.getElementById('activity-log-container');
    if (!logContainer) return; // Guard clause

    try {
        const historyRef = collection(db, "projects", projectId, "history");
        const snapshot = await getDocs(historyRef);
        
        logContainer.innerHTML = '';
        
        const logs = [];
        snapshot.forEach(doc => {
            logs.push({ ...doc.data(), id: doc.id });
        });
        
        // Sort DESC
        logs.sort((a,b) => b.timestamp.seconds - a.timestamp.seconds);
        
        if(logs.length === 0) {
            logContainer.innerHTML = '<p style="font-size:0.9rem; color:var(--text-muted);">No activity yet.</p>';
            return;
        }

        const fmt = new Intl.NumberFormat('th-TH');
        
        logs.forEach(log => {
            const item = document.createElement('div');
            item.style.padding = '0.75rem';
            item.style.background = 'rgba(255,255,255,0.5)';
            item.style.borderRadius = '8px';
            item.style.border = '1px solid #e2e8f0';
            
            const sign = log.amount > 0 ? '+' : '';
            const color = log.amount > 0 ? 'var(--primary-color)' : '#ef4444';
            
            const date = new Date(log.timestamp.seconds * 1000).toLocaleString();

            item.innerHTML = `
                <div class="flex-between">
                    <span style="font-weight:600; font-size: 0.9rem; color:${color}">${sign}${fmt.format(log.amount)}</span>
                     <span style="font-size:0.75rem; color:var(--text-muted);">${date}</span>
                </div>
                <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">
                    ${log.note || 'Update'} (Total: ${fmt.format(log.newTotal)})
                </div>
            `;
            logContainer.appendChild(item);
        });

    } catch(e) {
        console.error("History error", e);
        logContainer.innerHTML = `<p>Error loading history.</p>`;
    }
}

// Initial Fetch if logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        userEmailSpan.textContent = user.email;
        showDashboard();
        fetchProjects();
    } else {
        currentUser = null;
        showLogin();
    }
});
