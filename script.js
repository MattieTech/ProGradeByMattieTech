/* =============================================
   ProGrade – script.js | MattieTech
   Copyright © 2026 All Rights Reserved
   ============================================= */

// ---- STATE ---- //
const state = {
  gpa: { courses: [] },
  sem1: { courses: [] },
  sem2: { courses: [] },
  soundEnabled: true,
  darkMode: false,
  lastGPAResult: null,
  lastCGPAResult: null,
  charts: {}
};

// Grade scale (5-point system common in Nigerian universities)
const GRADES = {
  'A (5)': 5.0,
  'B (4)': 4.0,
  'C (3)': 3.0,
  'D (2)': 2.0,
  'E (1)': 1.0,
  'F (0)': 0.0
};

const GRADE_OPTIONS = Object.keys(GRADES);

// ---- INIT ---- //
document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  loadFromStorage();
  renderAllCourses();
  initTheme();
  setTimeout(showWAModal, 4000);
  updateLiveGPA();
});

// ---- LOADER ---- //
function initLoader() {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hide');
    setTimeout(() => document.getElementById('loader').remove(), 500);
  }, 2000);
}

// ---- THEME ---- //
function initTheme() {
  const saved = localStorage.getItem('pg_theme');
  if (saved === 'dark') {
    document.body.classList.add('dark');
    state.darkMode = true;
    document.getElementById('theme-toggle').textContent = '☀️';
  }
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  state.darkMode = !state.darkMode;
  document.body.classList.toggle('dark', state.darkMode);
  document.getElementById('theme-toggle').textContent = state.darkMode ? '☀️' : '🌙';
  localStorage.setItem('pg_theme', state.darkMode ? 'dark' : 'light');
  // Re-render charts if visible
  if (state.lastGPAResult || state.lastCGPAResult) renderCharts();
});

// ---- SOUND ---- //
document.getElementById('sound-toggle').addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  document.getElementById('sound-toggle').textContent = state.soundEnabled ? '🔊' : '🔇';
});

function playSound(type) {
  if (!state.soundEnabled) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  if (type === 'success') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523, ctx.currentTime);       // C5
    oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.15); // E5
    oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.3);  // G5
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.8);
  } else if (type === 'neutral') {
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    oscillator.frequency.setValueAtTime(494, ctx.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.6);
  } else if (type === 'fail') {
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(220, ctx.currentTime);
    oscillator.frequency.setValueAtTime(196, ctx.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.7);
  }
}

// ---- NAVIGATION ---- //
function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.toggle('open');
});

function closeMobileMenu() {
  document.getElementById('mobile-menu').classList.remove('open');
}

// ---- CALC TABS ---- //
function switchCalcTab(tab) {
  document.getElementById('tab-gpa').classList.toggle('active', tab === 'gpa');
  document.getElementById('tab-cgpa').classList.toggle('active', tab === 'cgpa');
  document.getElementById('panel-gpa').classList.toggle('hidden', tab !== 'gpa');
  document.getElementById('panel-cgpa').classList.toggle('hidden', tab !== 'cgpa');
}

// ---- COURSE MANAGEMENT ---- //
function createDefaultCourse(n) {
  return { title: '', credits: 0, grade: 'A (5)', id: Date.now() + Math.random() };
}

function addCourse(panel) {
  const course = createDefaultCourse(state[panel].courses.length + 1);
  state[panel].courses.push(course);
  renderCourses(panel);
  saveToStorage();
}

function removeCourse(panel, id) {
  state[panel].courses = state[panel].courses.filter(c => c.id !== id);
  renderCourses(panel);
  if (panel === 'gpa') updateLiveGPA();
  saveToStorage();
}

function updateCourse(panel, id, field, value) {
  const course = state[panel].courses.find(c => c.id === id);
  if (course) {
    course[field] = field === 'credits' ? parseFloat(value) || 0 : value;
    if (panel === 'gpa') updateLiveGPA();
    saveToStorage();
  }
}

function renderCourses(panel) {
  const container = document.getElementById(`${panel}-courses`);
  if (!container) return;
  container.innerHTML = '';
  if (state[panel].courses.length === 0) {
    addCourse(panel);
    return;
  }
  state[panel].courses.forEach((course, i) => {
    const row = document.createElement('div');
    row.className = 'course-row';
    row.innerHTML = `
      <input type="text" placeholder="Course ${i + 1}" value="${escapeHtml(course.title)}"
        oninput="updateCourse('${panel}', ${course.id}, 'title', this.value)" />
      <input type="number" placeholder="0" min="0" max="6" value="${course.credits || ''}"
        oninput="updateCourse('${panel}', ${course.id}, 'credits', this.value)" />
      <select onchange="updateCourse('${panel}', ${course.id}, 'grade', this.value)">
        ${GRADE_OPTIONS.map(g => `<option value="${g}" ${course.grade === g ? 'selected' : ''}>${g}</option>`).join('')}
      </select>
      <button class="btn-del" onclick="removeCourse('${panel}', ${course.id})">🗑</button>
    `;
    container.appendChild(row);
  });
}

function renderAllCourses() {
  ['gpa', 'sem1', 'sem2'].forEach(panel => {
    if (state[panel].courses.length === 0) state[panel].courses.push(createDefaultCourse(1), createDefaultCourse(2));
    renderCourses(panel);
  });
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- GPA CALCULATION ---- //
function calcGPA(courses) {
  let totalPoints = 0, totalCredits = 0;
  courses.forEach(c => {
    const pts = GRADES[c.grade] ?? 0;
    totalPoints += pts * (c.credits || 0);
    totalCredits += (c.credits || 0);
  });
  const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;
  return { gpa: parseFloat(gpa.toFixed(2)), totalCredits, totalPoints };
}

function updateLiveGPA() {
  const { gpa } = calcGPA(state.gpa.courses);
  document.getElementById('live-gpa-display').textContent = gpa.toFixed(2);
}

function validateCourses(courses) {
  for (const c of courses) {
    if (!c.title.trim()) { alert('Please enter a course title for all courses.'); return false; }
    if (!c.credits || c.credits <= 0) { alert(`Please enter valid credit units for "${c.title || 'a course'}".`); return false; }
  }
  return true;
}

function calculateGPA() {
  if (!validateCourses(state.gpa.courses)) return;
  const result = calcGPA(state.gpa.courses);
  state.lastGPAResult = { ...result, courses: [...state.gpa.courses] };
  saveToStorage();
  showResult(result.gpa, result.totalCredits, 'GPA');
  renderCharts();
}

function calculateCGPA() {
  if (!validateCourses(state.sem1.courses)) return;
  if (!validateCourses(state.sem2.courses)) return;

  const r1 = calcGPA(state.sem1.courses);
  const r2 = calcGPA(state.sem2.courses);
  const totalCredits = r1.totalCredits + r2.totalCredits;
  const totalPoints = r1.totalPoints + r2.totalPoints;
  const cgpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;

  state.lastCGPAResult = {
    sem1: { ...r1, courses: [...state.sem1.courses] },
    sem2: { ...r2, courses: [...state.sem2.courses] },
    cgpa, totalCredits, totalPoints
  };
  saveToStorage();

  showResult(cgpa, totalCredits, 'CGPA', `Sem 1 GPA: ${r1.gpa.toFixed(2)} | Sem 2 GPA: ${r2.gpa.toFixed(2)}`);
  renderCharts();
}

// ---- RESULT OVERLAY ---- //
function showResult(score, totalCredits, label, extra = '') {
  const overlay = document.getElementById('result-overlay');
  let cls, emoji, message, sound;

  if (score >= 4.5) {
    cls = 'first-class'; emoji = '🏆'; message = '🎉 First Class! Outstanding Performance'; sound = 'success';
    launchConfetti();
  } else if (score >= 3.5) {
    cls = 'second-upper'; emoji = '🎊'; message = '🎊 Great Job! Second Class Upper'; sound = 'success';
    launchParticles('blue');
  } else if (score >= 2.4) {
    cls = 'third'; emoji = '🙂'; message = '🙂 Good Effort, Keep Improving'; sound = 'neutral';
  } else {
    cls = 'fail'; emoji = '😢'; message = '😢 Don\'t Give Up, Try Again'; sound = 'fail';
    overlay.classList.add('shake');
    setTimeout(() => overlay.classList.remove('shake'), 500);
  }

  overlay.className = `${cls}`;
  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-score').textContent = score.toFixed(2);
  document.getElementById('result-label').textContent = label;
  document.getElementById('result-message').textContent = message;
  document.getElementById('result-details').innerHTML = `Total Credit Units: <strong>${totalCredits}</strong>${extra ? `<br>${extra}` : ''}`;

  overlay.classList.remove('hidden');
  playSound(sound);
}

function closeResult() {
  document.getElementById('result-overlay').classList.add('hidden');
  stopConfetti();
}

// ---- CONFETTI ---- //
let confettiAnimId = null;
const canvas = document.getElementById('confetti-canvas');
const ctx2d = canvas.getContext('2d');
let particles = [];

function launchConfetti() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  particles = [];
  for (let i = 0; i < 200; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: ['#f97316','#3b82f6','#22c55e','#eab308','#a855f7','#ec4899'][Math.floor(Math.random()*6)],
      speed: Math.random() * 4 + 2,
      angle: Math.random() * 360,
      spin: Math.random() * 4 - 2,
      opacity: 1
    });
  }
  animateConfetti();
}

function animateConfetti() {
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  let active = false;
  particles.forEach(p => {
    p.y += p.speed;
    p.angle += p.spin;
    if (p.y < canvas.height + 20) active = true;
    ctx2d.save();
    ctx2d.globalAlpha = Math.max(0, 1 - p.y / canvas.height);
    ctx2d.fillStyle = p.color;
    ctx2d.translate(p.x, p.y);
    ctx2d.rotate(p.angle * Math.PI / 180);
    ctx2d.fillRect(-p.w/2, -p.h/2, p.w, p.h);
    ctx2d.restore();
  });
  if (active) confettiAnimId = requestAnimationFrame(animateConfetti);
  else ctx2d.clearRect(0, 0, canvas.width, canvas.height);
}

function launchParticles(color) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  particles = [];
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 6 + 2,
      color: color === 'blue' ? '#3b82f6' : '#a855f7',
      vy: Math.random() * -2 - 0.5,
      vx: Math.random() * 2 - 1,
      opacity: 1
    });
  }
  animateParticles();
}

function animateParticles() {
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  let active = false;
  particles.forEach(p => {
    p.y += p.vy;
    p.x += p.vx;
    p.opacity -= 0.012;
    if (p.opacity > 0) active = true;
    ctx2d.save();
    ctx2d.globalAlpha = Math.max(0, p.opacity);
    ctx2d.fillStyle = p.color;
    ctx2d.beginPath();
    ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();
  });
  if (active) confettiAnimId = requestAnimationFrame(animateParticles);
  else ctx2d.clearRect(0, 0, canvas.width, canvas.height);
}

function stopConfetti() {
  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
}

// ---- CHARTS ---- //
function renderCharts() {
  document.getElementById('charts-empty').classList.add('hidden');
  document.getElementById('charts-content').classList.remove('hidden');

  renderCourseChart();
  renderSemesterChart();
  renderCGPAChart();
}

function destroyChart(key) {
  if (state.charts[key]) { state.charts[key].destroy(); delete state.charts[key]; }
}

function chartColors() {
  return state.darkMode
    ? { text: '#f1f1f1', grid: 'rgba(255,255,255,0.1)' }
    : { text: '#1a1a1a', grid: 'rgba(0,0,0,0.06)' };
}

function renderCourseChart() {
  destroyChart('course');
  const courses = state.lastGPAResult?.courses || state.lastCGPAResult?.sem1?.courses || [];
  if (!courses.length) return;
  const c = chartColors();
  state.charts.course = new Chart(document.getElementById('courseChart'), {
    type: 'bar',
    data: {
      labels: courses.map(c => c.title || 'Course'),
      datasets: [{
        label: 'Grade Points',
        data: courses.map(c => GRADES[c.grade] ?? 0),
        backgroundColor: courses.map((_,i) => ['#f97316','#3b82f6','#22c55e','#a855f7','#eab308','#ec4899'][i % 6]),
        borderRadius: 8, borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { cornerRadius: 10 } },
      scales: {
        y: { beginAtZero: true, max: 5, ticks: { color: c.text }, grid: { color: c.grid } },
        x: { ticks: { color: c.text }, grid: { display: false } }
      },
      animation: { duration: 800, easing: 'easeOutQuart' }
    }
  });
}

function renderSemesterChart() {
  destroyChart('semester');
  const r = state.lastCGPAResult;
  if (!r) return;
  const c = chartColors();
  state.charts.semester = new Chart(document.getElementById('semesterChart'), {
    type: 'bar',
    data: {
      labels: ['Semester 1', 'Semester 2'],
      datasets: [{
        label: 'GPA',
        data: [r.sem1.gpa, r.sem2.gpa],
        backgroundColor: ['#f97316', '#3b82f6'],
        borderRadius: 8, borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 5, ticks: { color: c.text }, grid: { color: c.grid } },
        x: { ticks: { color: c.text }, grid: { display: false } }
      },
      animation: { duration: 800 }
    }
  });
}

function renderCGPAChart() {
  destroyChart('cgpa');
  const history = JSON.parse(localStorage.getItem('pg_cgpa_history') || '[]');
  if (!state.lastCGPAResult) return;

  // Store CGPA history
  history.push({ label: `Calc ${history.length + 1}`, cgpa: state.lastCGPAResult.cgpa });
  if (history.length > 10) history.shift();
  localStorage.setItem('pg_cgpa_history', JSON.stringify(history));

  const c = chartColors();
  state.charts.cgpa = new Chart(document.getElementById('cgpaChart'), {
    type: 'line',
    data: {
      labels: history.map(h => h.label),
      datasets: [{
        label: 'CGPA',
        data: history.map(h => h.cgpa),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.1)',
        tension: 0.4, fill: true,
        pointBackgroundColor: '#f97316',
        pointRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 5, ticks: { color: c.text }, grid: { color: c.grid } },
        x: { ticks: { color: c.text }, grid: { display: false } }
      },
      animation: { duration: 800 }
    }
  });
}

// ---- RESET ---- //
function resetGPA() {
  if (!confirm('Reset GPA calculator? This will clear all courses.')) return;
  state.gpa.courses = [createDefaultCourse(1), createDefaultCourse(2)];
  renderCourses('gpa');
  updateLiveGPA();
  saveToStorage();
}

function resetCGPA() {
  if (!confirm('Reset CGPA calculator? This will clear all semester courses.')) return;
  state.sem1.courses = [createDefaultCourse(1), createDefaultCourse(2)];
  state.sem2.courses = [createDefaultCourse(1), createDefaultCourse(2)];
  renderCourses('sem1');
  renderCourses('sem2');
  saveToStorage();
}

// ---- LOCAL STORAGE ---- //
function saveToStorage() {
  localStorage.setItem('pg_gpa', JSON.stringify(state.gpa));
  localStorage.setItem('pg_sem1', JSON.stringify(state.sem1));
  localStorage.setItem('pg_sem2', JSON.stringify(state.sem2));
  if (state.lastGPAResult) localStorage.setItem('pg_last_gpa', JSON.stringify(state.lastGPAResult));
  if (state.lastCGPAResult) localStorage.setItem('pg_last_cgpa', JSON.stringify(state.lastCGPAResult));
}

function loadFromStorage() {
  try {
    const gpa = JSON.parse(localStorage.getItem('pg_gpa'));
    const sem1 = JSON.parse(localStorage.getItem('pg_sem1'));
    const sem2 = JSON.parse(localStorage.getItem('pg_sem2'));
    const lastGPA = JSON.parse(localStorage.getItem('pg_last_gpa'));
    const lastCGPA = JSON.parse(localStorage.getItem('pg_last_cgpa'));
    if (gpa?.courses?.length) state.gpa = gpa;
    if (sem1?.courses?.length) state.sem1 = sem1;
    if (sem2?.courses?.length) state.sem2 = sem2;
    if (lastGPA) { state.lastGPAResult = lastGPA; }
    if (lastCGPA) { state.lastCGPAResult = lastCGPA; }
    // Restore IDs as numbers
    ['gpa','sem1','sem2'].forEach(p => {
      state[p].courses = state[p].courses.map(c => ({ ...c, id: Number(c.id) }));
    });
  } catch(e) { console.warn('Storage load error', e); }
}

// ---- CONTACT ---- //
function sendMessage() {
  const name = document.getElementById('contact-name').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const msg = document.getElementById('contact-message').value.trim();
  if (!name || !email || !msg) { alert('Please fill all fields.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('Please enter a valid email.'); return; }
  alert(`❌ Message not sent, ${name}! MattieTech will be available  soon.`);
  document.getElementById('contact-name').value = '';
  document.getElementById('contact-email').value = '';
  document.getElementById('contact-message').value = '';
}

// ---- WA MODAL ---- //
function showWAModal() {
  const shown = sessionStorage.getItem('pg_wa_shown');
  if (!shown) {
    document.getElementById('wa-modal').classList.remove('hidden');
    sessionStorage.setItem('pg_wa_shown', '1');
  }
}

function closeWAModal() {
  document.getElementById('wa-modal').classList.add('hidden');
}

// ---- NAV ACTIVE STATE ---- //
window.addEventListener('scroll', () => {
  const sections = ['hero','calculator','charts','contact'];
  const scrollY = window.scrollY + 100;
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.offsetTop, bottom = top + el.offsetHeight;
    const link = document.querySelector(`.nav-link[href="#${id}"]`);
    if (link) link.style.color = (scrollY >= top && scrollY < bottom) ? 'var(--orange)' : '';
  });
});

// Resize confetti canvas on resize
window.addEventListener('resize', () => {
  if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
});
