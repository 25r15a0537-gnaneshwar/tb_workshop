const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let currentPassId = null;

// Show specific screen
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Login Form Handler
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            document.getElementById('loginError').textContent = '';
            
            // Route to appropriate dashboard
            if (data.user.role === 'student') {
                document.getElementById('studentName').textContent = data.user.name;
                showScreen('studentScreen');
                loadStudentPasses();
            } else if (data.user.role === 'moderator') {
                document.getElementById('moderatorName').textContent = data.user.name;
                showScreen('moderatorScreen');
                loadPendingPasses();
            } else if (data.user.role === 'gatekeeper') {
                document.getElementById('gatekeeperName').textContent = data.user.name;
                showScreen('gatekeeperScreen');
                loadApprovedPasses();
            }
        } else {
            document.getElementById('loginError').textContent = 'Invalid email or password';
        }
    } catch (error) {
        document.getElementById('loginError').textContent = 'Login failed. Make sure server is running.';
        console.error('Login error:', error);
    }
});

// Logout
function logout() {
    currentUser = null;
    document.getElementById('loginForm').reset();
    showScreen('loginScreen');
}

// Student: Request Pass
document.getElementById('passRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const reason = document.getElementById('passReason').value;
    const date = document.getElementById('passDate').value;
    const time = document.getElementById('passTime').value;
    
    try {
        const response = await fetch(`${API_URL}/pass/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId: currentUser.id,
                reason: reason,
                exitDate: date,
                exitTime: time
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('passReason').value = '';
            document.getElementById('passDate').value = '';
            document.getElementById('passTime').value = '';
            alert('Pass request submitted successfully!');
            loadStudentPasses();
        }
    } catch (error) {
        alert('Failed to submit request');
        console.error('Request error:', error);
    }
});

// Student: Load their passes
async function loadStudentPasses() {
    try {
        const response = await fetch(`${API_URL}/pass/student/${currentUser.id}`);
        const data = await response.json();
        
        const container = document.getElementById('studentPassesList');
        
        if (data.passes.length === 0) {
            container.innerHTML = '<div class="empty-state">No gate passes yet. Request one above!</div>';
            return;
        }
        
        container.innerHTML = data.passes.map(pass => `
            <div class="pass-item ${pass.status}">
                <div class="pass-header">
                    <span class="pass-id">${pass.id}</span>
                    <span class="pass-status ${pass.status}">${pass.status}</span>
                </div>
                <div class="pass-reason"><strong>Reason:</strong> ${pass.reason}</div>
                <div class="pass-detail-row">
                    <div class="pass-detail">
                        <strong>Exit Date</strong>
                        ${pass.exitDate || 'Not specified'}
                    </div>
                    <div class="pass-detail">
                        <strong>Exit Time</strong>
                        ${pass.exitTime || 'Not specified'}
                    </div>
                </div>
                ${pass.moderatorRemarks ? `<div class="pass-remarks"><strong>Remarks:</strong> ${pass.moderatorRemarks}</div>` : ''}
                <div class="pass-time">Requested: ${new Date(pass.requestedAt).toLocaleString()}</div>
                ${pass.usedAt ? `<div class="pass-time">Used: ${new Date(pass.usedAt).toLocaleString()}</div>` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading passes:', error);
    }
}

// Moderator: Load pending passes
async function loadPendingPasses() {
    try {
        const response = await fetch(`${API_URL}/pass/pending`);
        const data = await response.json();
        
        const container = document.getElementById('pendingPassesList');
        
        if (data.passes.length === 0) {
            container.innerHTML = '<div class="empty-state">No pending pass requests</div>';
            return;
        }
        
        container.innerHTML = data.passes.map(pass => `
            <div class="pass-item pending">
                <div class="pass-header">
                    <span class="pass-id">${pass.id}</span>
                    <span class="pass-status pending">Pending</span>
                </div>
                <div class="pass-reason"><strong>Student:</strong> ${pass.studentName}</div>
                <div class="pass-reason"><strong>Reason:</strong> ${pass.reason}</div>
                <div class="pass-time">Requested: ${new Date(pass.requestedAt).toLocaleString()}</div>
                <div class="pass-actions">
                    <button onclick="openModerateModal('${pass.id}', '${pass.studentName}', '${pass.reason.replace(/'/g, "&#39;")}')" class="btn btn-primary">Review</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading pending passes:', error);
    }
}

// Open Moderate Modal
function openModerateModal(passId, studentName, reason) {
    currentPassId = passId;
    document.getElementById('moderateModal').classList.add('active');
    document.getElementById('modalPassDetails').innerHTML = `
        <div class="pass-item">
            <div><strong>Pass ID:</strong> ${passId}</div>
            <div><strong>Student:</strong> ${studentName}</div>
            <div><strong>Reason:</strong> ${reason}</div>
        </div>
    `;
}

// Close Modal
function closeModal() {
    document.getElementById('moderateModal').classList.remove('active');
    document.getElementById('moderatorRemarks').value = '';
    currentPassId = null;
}

// Moderate Pass (Approve/Reject)
async function moderatePass(status) {
    const remarks = document.getElementById('moderatorRemarks').value;
    
    try {
        const response = await fetch(`${API_URL}/pass/moderate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                passId: currentPassId,
                status: status,
                remarks: remarks
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Pass ${status === 'approved' ? 'approved' : 'rejected'} successfully!`);
            closeModal();
            loadPendingPasses();
        }
    } catch (error) {
        alert('Failed to process request');
        console.error('Moderate error:', error);
    }
}

// Gatekeeper: Load approved passes
async function loadApprovedPasses() {
    try {
        const response = await fetch(`${API_URL}/pass/approved`);
        const data = await response.json();
        
        const container = document.getElementById('approvedPassesList');
        
        if (data.passes.length === 0) {
            container.innerHTML = '<div class="empty-state">No approved passes available</div>';
            return;
        }
        
        container.innerHTML = data.passes.map(pass => `
            <div class="pass-item approved">
                <div class="pass-header">
                    <span class="pass-id">${pass.id}</span>
                    <span class="pass-status approved">Approved</span>
                </div>
                <div class="pass-reason"><strong>Student:</strong> ${pass.studentName}</div>
                <div class="pass-reason"><strong>Reason:</strong> ${pass.reason}</div>
                ${pass.moderatorRemarks ? `<div class="pass-remarks"><strong>Remarks:</strong> ${pass.moderatorRemarks}</div>` : ''}
                <div class="pass-time">Approved: ${new Date(pass.moderatedAt).toLocaleString()}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading approved passes:', error);
    }
}

// Gatekeeper: Verify Pass
async function verifyPass() {
    const passId = document.getElementById('passIdInput').value.trim();
    
    if (!passId) {
        alert('Please enter a Pass ID');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/pass/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passId: passId })
        });
        
        const data = await response.json();
        const resultContainer = document.getElementById('verifyResult');
        
        if (data.success) {
            resultContainer.innerHTML = `
                <div class="verify-success">
                    <h4>✓ Pass Verified Successfully</h4>
                    <p><strong>Pass ID:</strong> ${data.pass.id}</p>
                    <p><strong>Student:</strong> ${data.studentName}</p>
                    <p><strong>Reason:</strong> ${data.pass.reason}</p>
                    <p><strong>Used At:</strong> ${new Date(data.pass.usedAt).toLocaleString()}</p>
                </div>
            `;
            document.getElementById('passIdInput').value = '';
            loadApprovedPasses();
        } else {
            resultContainer.innerHTML = `
                <div class="verify-error">
                    <h4>✗ Verification Failed</h4>
                    <p>${data.message}</p>
                </div>
            `;
        }
    } catch (error) {
        alert('Verification failed');
        console.error('Verify error:', error);
    }
}

// Auto-refresh for moderator and gatekeeper every 10 seconds
setInterval(() => {
    if (currentUser) {
        if (currentUser.role === 'moderator') {
            loadPendingPasses();
        } else if (currentUser.role === 'gatekeeper') {
            loadApprovedPasses();
        }
    }
}, 10000);