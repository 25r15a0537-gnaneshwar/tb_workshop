const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Helper function to read database
function readDatabase() {
  const data = fs.readFileSync('database.json', 'utf8');
  return JSON.parse(data);
}

// Helper function to write database
function writeDatabase(data) {
  fs.writeFileSync('database.json', JSON.stringify(data, null, 2));
}

// API: Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDatabase();
  
  const user = db.users.find(u => u.email === email && u.password === password);
  
  if (user) {
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// API: Create Pass Request (Student)
app.post('/api/pass/request', (req, res) => {
  const { studentId, reason, exitDate, exitTime } = req.body;
  const db = readDatabase();
  
  const newPass = {
    id: `PASS${Date.now()}`,
    studentId: studentId,
    reason: reason,
    exitDate: exitDate || null,
    exitTime: exitTime || null,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    moderatorRemarks: '',
    usedAt: null
  };
  
  db.passes.push(newPass);
  writeDatabase(db);
  
  res.json({ success: true, pass: newPass });
});

// API: Get Student's Passes
app.get('/api/pass/student/:studentId', (req, res) => {
  const { studentId } = req.params;
  const db = readDatabase();
  
  const studentPasses = db.passes.filter(p => p.studentId === studentId);
  res.json({ success: true, passes: studentPasses });
});

// API: Get All Pending Passes (Moderator)
app.get('/api/pass/pending', (req, res) => {
  const db = readDatabase();
  const pendingPasses = db.passes.filter(p => p.status === 'pending');
  
  const passesWithNames = pendingPasses.map(pass => {
    const student = db.users.find(u => u.id === pass.studentId);
    return {
      ...pass,
      studentName: student ? student.name : 'Unknown'
    };
  });
  
  res.json({ success: true, passes: passesWithNames });
});

// API: Approve/Reject Pass (Moderator)
app.post('/api/pass/moderate', (req, res) => {
  const { passId, status, remarks } = req.body;
  const db = readDatabase();
  
  const passIndex = db.passes.findIndex(p => p.id === passId);
  
  if (passIndex !== -1) {
    db.passes[passIndex].status = status;
    db.passes[passIndex].moderatorRemarks = remarks;
    db.passes[passIndex].moderatedAt = new Date().toISOString();
    
    writeDatabase(db);
    res.json({ success: true, pass: db.passes[passIndex] });
  } else {
    res.status(404).json({ success: false, message: 'Pass not found' });
  }
});

// API: Get Approved Passes (Gatekeeper)
app.get('/api/pass/approved', (req, res) => {
  const db = readDatabase();
  const approvedPasses = db.passes.filter(p => p.status === 'approved' && !p.usedAt);
  
  const passesWithNames = approvedPasses.map(pass => {
    const student = db.users.find(u => u.id === pass.studentId);
    return {
      ...pass,
      studentName: student ? student.name : 'Unknown'
    };
  });
  
  res.json({ success: true, passes: passesWithNames });
});

// API: Verify and Use Pass (Gatekeeper)
app.post('/api/pass/verify', (req, res) => {
  const { passId } = req.body;
  const db = readDatabase();
  
  const passIndex = db.passes.findIndex(p => p.id === passId);
  
  if (passIndex !== -1) {
    const pass = db.passes[passIndex];
    
    if (pass.status !== 'approved') {
      return res.json({ success: false, message: 'Pass not approved' });
    }
    
    if (pass.usedAt) {
      return res.json({ success: false, message: 'Pass already used' });
    }
    
    db.passes[passIndex].usedAt = new Date().toISOString();
    writeDatabase(db);
    
    const student = db.users.find(u => u.id === pass.studentId);
    
    res.json({
      success: true,
      pass: db.passes[passIndex],
      studentName: student ? student.name : 'Unknown'
    });
  } else {
    res.status(404).json({ success: false, message: 'Pass not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop the server');
});