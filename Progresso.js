// LocalStorage Keys
const STORAGE_KEYS = {
  USER: 'allfit_user',
  WORKOUTS: 'allfit_workouts',
  MEALS: 'allfit_meals',
  WEIGHTS: 'allfit_weights',
  WATER: 'allfit_water',
  SETTINGS: 'allfit_settings'
};

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
  document.body.classList.add('loaded');
  
  loadUserData();
  updateTodayDate();
  updateDashboard();
  updateHistory();
  
  // Mobile menu
  document.querySelector('.mobile-menu-toggle')?.addEventListener('click', function() {
    document.querySelector('.nav-links')?.classList.toggle('active');
    this.classList.toggle('active');
  });

  // Newsletter
  document.querySelector('.newsletter-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    showNotification('Obrigado pela subscrição! 📧');
    this.reset();
  });
});

// ── USER DATA ────────────────────────────────────────────────────
function loadUserData() {
  const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
  if (user.name) {
    document.getElementById('userName').textContent = user.name;
  }
  const workouts = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKOUTS) || '[]');
  document.getElementById('streakDays').textContent = calculateStreak(workouts);
}

function editProfile() {
  const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
  document.getElementById('profileName').value = user.name || '';
  document.getElementById('profileWeight').value = user.initialWeight || '';
  document.getElementById('profileGoal').value = user.goal || 'hipertrofia';
  showModal('profileModal');
}

function saveProfile(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const user = {
    name: formData.get('name'),
    initialWeight: formData.get('initialWeight'),
    goal: formData.get('goal')
  };
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  document.getElementById('userName').textContent = user.name;
  closeModal('profileModal');
  showNotification('Perfil atualizado! ✅');
}

// ── DATE ────────────────────────────────────────────────────
function updateTodayDate() {
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('todayDate').textContent = today.toLocaleDateString('pt-PT', options);
}

// ── DASHBOARD ────────────────────────────────────────────────────
function updateDashboard() {
  const today = new Date().toDateString();

  // Treinos
  const workouts = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKOUTS) || '[]');
  const todayWorkouts = workouts.filter(w => new Date(w.date).toDateString() === today);
  document.getElementById('totalWorkouts').textContent = workouts.length;

  if (todayWorkouts.length > 0) {
    const last = todayWorkouts[todayWorkouts.length - 1];
    document.getElementById('todayWorkout').textContent = `${last.type} — ${last.duration}min`;
  } else {
    document.getElementById('todayWorkout').textContent = 'Não registado';
  }

  // Calorias totais
  const totalCals = workouts.reduce((sum, w) => sum + parseInt(w.calories || 0), 0);
  document.getElementById('totalCalories').textContent = formatNumber(totalCals);

  const todayCals = todayWorkouts.reduce((sum, w) => sum + parseInt(w.calories || 0), 0);
  document.getElementById('todayCalories').textContent = todayCals;

  // Média duração
  const avgDuration = workouts.length > 0
    ? Math.round(workouts.reduce((sum, w) => sum + parseInt(w.duration || 0), 0) / workouts.length)
    : 0;
  document.getElementById('avgDuration').textContent = avgDuration;

  // Água
  const waterLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATER) || '[]');
  const todayWater = waterLogs.filter(w => new Date(w.date).toDateString() === today);
  const totalWater = todayWater.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);
  document.getElementById('todayWater').textContent = totalWater.toFixed(1);
  const waterPercent = Math.min((totalWater / 3) * 100, 100);
  document.getElementById('waterBar').style.width = waterPercent + '%';

  // Peso
  const weights = JSON.parse(localStorage.getItem(STORAGE_KEYS.WEIGHTS) || '[]');
  if (weights.length > 0) {
    document.getElementById('currentWeight').textContent = weights[weights.length - 1].weight;
  }

  // Streak
  document.getElementById('streakDays').textContent = calculateStreak(workouts);

  updateChart('workouts');
}

// ── CHART ────────────────────────────────────────────────────
let currentChart = 'workouts';

function switchChart(type, btn) {
  currentChart = type;
  document.querySelectorAll('.chart-tab').forEach(tab => tab.classList.remove('active'));
  if (btn) btn.classList.add('active');
  updateChart(type);
}

function updateChart(type) {
  const container = document.getElementById('chartBars');
  container.innerHTML = '';

  const dayNames  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today     = new Date();
  const weekData  = [];

  const workoutsAll = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKOUTS) || '[]');
  const weightsAll  = JSON.parse(localStorage.getItem(STORAGE_KEYS.WEIGHTS)  || '[]');

  for (let i = 6; i >= 0; i--) {
    const date    = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toDateString();
    const isToday = i === 0;
    let displayValue = 0;   // valor real mostrado no label
    let chartValue   = 0;   // valor usado para altura da barra

    if (type === 'workouts') {
      displayValue = workoutsAll.filter(w => new Date(w.date).toDateString() === dateStr).length;
      chartValue   = displayValue;
    } else if (type === 'weight') {
      const day = weightsAll.filter(w => new Date(w.date).toDateString() === dateStr);
      displayValue = day.length > 0 ? parseFloat(day[day.length - 1].weight) : 0;
      chartValue   = displayValue;
    } else if (type === 'calories') {
      displayValue = workoutsAll
        .filter(w => new Date(w.date).toDateString() === dateStr)
        .reduce((sum, w) => sum + parseInt(w.calories || 0), 0);
      chartValue = Math.round(displayValue / 10); // escala para a barra
    }

    weekData.push({
      day: dayNames[date.getDay()],
      dayNum: date.getDate(),
      month: date.getMonth() + 1,
      displayValue,
      chartValue,
      isToday
    });
  }

  const maxChart = Math.max(...weekData.map(d => d.chartValue), 1);

  // Configurações por tipo
  const cfg = {
    workouts: { unit: 'treinos',  emptyMsg: 'Sem treinos registados esta semana.' },
    weight:   { unit: 'kg',       emptyMsg: 'Sem registos de peso esta semana.' },
    calories: { unit: 'kcal',     emptyMsg: 'Sem calorias registadas esta semana.' }
  }[type];

  const allEmpty = weekData.every(d => d.displayValue === 0);

  // ── Wrapper com eixo Y + área de barras ─────────────────────
  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap';

  // Eixo Y (3 labels)
  const yAxis = document.createElement('div');
  yAxis.className = 'chart-y-axis';

  const topVal = type === 'calories' ? maxChart * 10 : maxChart;
  const midVal = type === 'calories' ? Math.round(maxChart * 5) : Math.round(maxChart / 2);

  ['', midVal, topVal].forEach((v, idx) => {
    const lbl = document.createElement('span');
    lbl.className = 'y-label';
    lbl.textContent = idx === 0 ? '0' : (v > 0 ? v : '');
    yAxis.appendChild(lbl);
  });

  // Área com grid + barras
  const area = document.createElement('div');
  area.className = 'chart-area';

  // Linhas de grid
  [0, 50, 100].forEach(pct => {
    const line = document.createElement('div');
    line.className = 'chart-grid-line';
    line.style.bottom = pct + '%';
    area.appendChild(line);
  });

  if (allEmpty) {
    const empty = document.createElement('div');
    empty.className = 'chart-empty';
    empty.innerHTML = `<span>📊</span><p>${cfg.emptyMsg}</p>`;
    area.appendChild(empty);
  } else {
    weekData.forEach(data => {
      const pct = (data.chartValue / maxChart) * 100;
      const col = document.createElement('div');
      col.className = 'chart-col' + (data.isToday ? ' chart-col-today' : '');

      const valLbl = document.createElement('div');
      valLbl.className = 'bar-value-lbl';
      valLbl.textContent = data.displayValue > 0
        ? (type === 'calories' ? data.displayValue.toLocaleString('pt-PT') : data.displayValue)
        : '';

      const barWrap = document.createElement('div');
      barWrap.className = 'bar-wrap';

      const fill = document.createElement('div');
      fill.className = 'bar-fill-new' + (data.isToday ? ' bar-fill-today' : '');
      fill.style.height = '0%';

      const dayLbl = document.createElement('div');
      dayLbl.className = 'bar-day-lbl';
      dayLbl.innerHTML = `<strong>${data.day}</strong><small>${data.dayNum}/${data.month}</small>`;

      barWrap.appendChild(fill);
      col.appendChild(valLbl);
      col.appendChild(barWrap);
      col.appendChild(dayLbl);
      area.appendChild(col);

      // Animar após render
      requestAnimationFrame(() => {
        setTimeout(() => { fill.style.height = pct + '%'; }, 60);
      });
    });
  }

  wrap.appendChild(yAxis);
  wrap.appendChild(area);
  container.appendChild(wrap);

  // ── Resumo semanal ───────────────────────────────────────────
  const summary = buildWeekSummary(type, weekData, cfg);
  container.appendChild(summary);
}

function buildWeekSummary(type, weekData, cfg) {
  const active = weekData.filter(d => d.displayValue > 0);
  const total  = active.reduce((s, d) => s + d.displayValue, 0);
  const best   = active.length > 0 ? active.reduce((a, b) => b.displayValue > a.displayValue ? b : a) : null;

  const div = document.createElement('div');
  div.className = 'chart-summary';

  if (type === 'workouts') {
    div.innerHTML = `
      <div class="cs-item"><span class="cs-val">${total}</span><span class="cs-lbl">Treinos esta semana</span></div>
      <div class="cs-item"><span class="cs-val">${active.length}/7</span><span class="cs-lbl">Dias activos</span></div>
      <div class="cs-item"><span class="cs-val">${best ? best.day : '—'}</span><span class="cs-lbl">Melhor dia</span></div>
    `;
  } else if (type === 'calories') {
    const avg = active.length > 0 ? Math.round(total / active.length) : 0;
    div.innerHTML = `
      <div class="cs-item"><span class="cs-val">${total.toLocaleString('pt-PT')}</span><span class="cs-lbl">kcal esta semana</span></div>
      <div class="cs-item"><span class="cs-val">${avg.toLocaleString('pt-PT')}</span><span class="cs-lbl">kcal médias/treino</span></div>
      <div class="cs-item"><span class="cs-val">${best ? best.day : '—'}</span><span class="cs-lbl">Dia mais intenso</span></div>
    `;
  } else if (type === 'weight') {
    const first = active.length > 0 ? active[0].displayValue : null;
    const last  = active.length > 0 ? active[active.length - 1].displayValue : null;
    const diff  = (first && last) ? (last - first).toFixed(1) : null;
    const sign  = diff > 0 ? '+' : '';
    div.innerHTML = `
      <div class="cs-item"><span class="cs-val">${last ? last + ' kg' : '—'}</span><span class="cs-lbl">Último registo</span></div>
      <div class="cs-item"><span class="cs-val">${diff !== null ? sign + diff + ' kg' : '—'}</span><span class="cs-lbl">Variação semanal</span></div>
      <div class="cs-item"><span class="cs-val">${active.length}</span><span class="cs-lbl">Registos esta semana</span></div>
    `;
  }

  return div;
}

// ── HISTORY ────────────────────────────────────────────────────
function updateHistory() {
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = '';

  const allEntries = [];
  const workouts = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKOUTS) || '[]');
  const meals = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEALS) || '[]');
  const weights = JSON.parse(localStorage.getItem(STORAGE_KEYS.WEIGHTS) || '[]');
  const water = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATER) || '[]');

  workouts.forEach(w => allEntries.push({ ...w, category: 'workout' }));
  meals.forEach(m => allEntries.push({ ...m, category: 'meal' }));
  weights.forEach(w => allEntries.push({ ...w, category: 'weight' }));
  water.forEach(w => allEntries.push({ ...w, category: 'water' }));

  allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allEntries.length === 0) {
    historyList.innerHTML = '<p class="empty-state">Nenhum registo ainda. Comece a registar!</p>';
    return;
  }

  allEntries.forEach(entry => {
    const item = document.createElement('div');
    item.className = 'history-item';

    const date = new Date(entry.date);
    const timeStr = date.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    let icon = '', title = '', details = '';

    if (entry.category === 'workout') {
      icon = '🏋️'; title = `Treino: ${entry.type}`; details = `${entry.duration}min • ${entry.calories} kcal`;
    } else if (entry.category === 'meal') {
      icon = '🍽️'; title = entry.mealType; details = `${entry.description} • ${entry.calories} kcal`;
    } else if (entry.category === 'weight') {
      icon = '⚖️'; title = 'Peso Registado'; details = `${entry.weight} kg`;
    } else if (entry.category === 'water') {
      icon = '💧'; title = 'Água'; details = `${entry.amount}L`;
    }

    item.innerHTML = `
      <div class="history-icon">${icon}</div>
      <div class="history-info">
        <div class="history-title">${title}</div>
        <div class="history-details">${details}</div>
        <div class="history-time">${timeStr}</div>
      </div>
    `;
    historyList.appendChild(item);
  });
}

// ── MODALS ────────────────────────────────────────────────────
function showModal(modalId) {
  document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

function showWorkoutLog() { showModal('workoutModal'); }
function showMealLog()    { showModal('mealModal'); }
function showWeightLog()  { showModal('weightModal'); }
function showWaterLog()   { showModal('waterModal'); }

// Fechar modal ao clicar fora
window.addEventListener('click', function(event) {
  if (event.target.classList.contains('modal')) {
    event.target.classList.remove('show');
  }
});

// ── LOG FUNCTIONS ────────────────────────────────────────────────────
function logWorkout(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const workout = {
    date: new Date().toISOString(),
    type: formData.get('workoutType'),
    duration: formData.get('duration'),
    calories: formData.get('calories'),
    notes: formData.get('notes')
  };
  const workouts = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORKOUTS) || '[]');
  workouts.push(workout);
  localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
  closeModal('workoutModal');
  event.target.reset();
  updateDashboard();
  updateHistory();
  showNotification('Treino registado! 💪');
}

function logMeal(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const meal = {
    date: new Date().toISOString(),
    mealType: formData.get('mealType'),
    description: formData.get('description'),
    calories: formData.get('calories'),
    protein: formData.get('protein')
  };
  const meals = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEALS) || '[]');
  meals.push(meal);
  localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
  closeModal('mealModal');
  event.target.reset();
  updateDashboard();
  updateHistory();
  showNotification('Refeição registada! 🍽️');
}

function logWeight(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const weight = {
    date: new Date().toISOString(),
    weight: formData.get('weight'),
    notes: formData.get('notes')
  };
  const weights = JSON.parse(localStorage.getItem(STORAGE_KEYS.WEIGHTS) || '[]');
  weights.push(weight);
  localStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(weights));
  closeModal('weightModal');
  event.target.reset();
  updateDashboard();
  updateHistory();
  showNotification('Peso registado! ⚖️');
}

function logWater(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const waterLog = {
    date: new Date().toISOString(),
    amount: formData.get('amount')
  };
  const water = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATER) || '[]');
  water.push(waterLog);
  localStorage.setItem(STORAGE_KEYS.WATER, JSON.stringify(water));
  closeModal('waterModal');
  event.target.reset();
  updateDashboard();
  updateHistory();
  showNotification('Água registada! 💧');
}

function setWaterAmount(amount) {
  document.getElementById('waterAmount').value = amount;
}

// ── CLEAR HISTORY ────────────────────────────────────────────────────
function clearHistory() {
  if (confirm('Tens a certeza? Esta ação não pode ser desfeita.')) {
    localStorage.removeItem(STORAGE_KEYS.WORKOUTS);
    localStorage.removeItem(STORAGE_KEYS.MEALS);
    localStorage.removeItem(STORAGE_KEYS.WEIGHTS);
    localStorage.removeItem(STORAGE_KEYS.WATER);
    updateDashboard();
    updateHistory();
    showNotification('Histórico limpo! 🗑️');
  }
}

// ── UTILITIES ────────────────────────────────────────────────────
function calculateStreak(workouts) {
  if (workouts.length === 0) return 0;
  const sortedDates = workouts
    .map(w => new Date(w.date).toDateString())
    .filter((date, index, self) => self.indexOf(date) === index)
    .sort((a, b) => new Date(b) - new Date(a));

  let streak = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    if (sortedDates[i] === expected.toDateString()) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function formatNumber(num) {
  return num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num;
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.classList.add('show'), 10);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}