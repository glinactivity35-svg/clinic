// ========== КОНФИГУРАЦИЯ ==========
const SUPABASE_URL = 'https://pybzxnewptledlezyyuj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Ynp4bmV3cHRsZWRsZXp5eXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODI1MjAsImV4cCI6MjA4OTc1ODUyMH0.jdYcl1BuBcgE2axHTdAiq06ANMmKaO3_6zrA94zMQGM';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TIMES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentUser = null;
let allDoctors = [];
let allAppointments = [];
let allReviews = [];
let selectedRating = 5;

// ========== АВТОРИЗАЦИЯ ==========
async function checkAuth() {
    try {
        const { data: { session }, error } = await sb.auth.getSession();
        if (error) throw error;
        
        if (session) {
            currentUser = session.user;
            const userInfo = document.getElementById('userInfo');
            const userEmail = document.getElementById('userEmail');
            if (userInfo) userInfo.style.display = 'flex';
            if (userEmail) userEmail.textContent = currentUser.email;
            console.log('✅ Авторизован:', currentUser.email);
        } else {
            console.log('❌ Не авторизован');
        }
    } catch (err) {
        console.error('Ошибка проверки сессии:', err);
    }
}

function showAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'block';
}

function hideAuthModal() {
    const modal = document.getElementById('authModal');
    const email = document.getElementById('authEmail');
    const password = document.getElementById('authPassword');
    const msg = document.getElementById('authMessage');
    if (modal) modal.style.display = 'none';
    if (email) email.value = '';
    if (password) password.value = '';
    if (msg) msg.textContent = '';
}

async function login() {
    const email = document.getElementById('authEmail')?.value;
    const password = document.getElementById('authPassword')?.value;
    const msg = document.getElementById('authMessage');
    
    if (!email || !password) {
        if (msg) msg.textContent = '❌ Заполните все поля';
        return;
    }
    
    try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        currentUser = data.user;
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        if (userInfo) userInfo.style.display = 'flex';
        if (userEmail) userEmail.textContent = currentUser.email;
        
        hideAuthModal();
        showMsg('✅ Добро пожаловать, ' + currentUser.email, 'success');
    } catch (err) {
        if (msg) msg.textContent = '❌ ' + err.message;
    }
}

async function register() {
    const email = document.getElementById('authEmail')?.value;
    const password = document.getElementById('authPassword')?.value;
    const msg = document.getElementById('authMessage');
    
    if (!email || !password) {
        if (msg) msg.textContent = '❌ Заполните все поля';
        return;
    }
    
    if (password.length < 6) {
        if (msg) msg.textContent = '❌ Пароль не менее 6 символов';
        return;
    }
    
    try {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        
        if (msg) {
            msg.style.color = 'green';
            msg.textContent = '✅ Регистрация успешна! Теперь войдите';
        }
        document.getElementById('authPassword').value = '';
    } catch (err) {
        if (msg) msg.textContent = '❌ ' + err.message;
    }
}

async function logout() {
    await sb.auth.signOut();
    currentUser = null;
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.style.display = 'none';
    showMsg('👋 Вы вышли', 'info');
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadDoctors() {
    const { data, error } = await sb.from('doctors').select('*');
    if (!error) {
        allDoctors = data || [];
        renderDoctors();


updateDoctorSelects();
    }
}

async function loadAppointments() {
    const { data, error } = await sb.from('appointments').select('*').order('created_at', { ascending: false });
    if (!error) {
        allAppointments = data || [];
        renderAppointments();
        updateTimeOptions();
    }
}

async function loadReviews() {
    const { data, error } = await sb.from('reviews').select('*').order('created_at', { ascending: false });
    if (!error) {
        allReviews = data || [];
        renderReviews();
    }
}

// ========== СОХРАНЕНИЕ ==========
async function saveAppointment(data) {
    const { error } = await sb.from('appointments').insert([data]);
    if (error) throw error;
    await loadAppointments();
}

async function deleteAppointmentById(id) {
    const { error } = await sb.from('appointments').delete().eq('id', id);
    if (error) throw error;
    await loadAppointments();
}

async function saveReview(data) {
    const { error } = await sb.from('reviews').insert([data]);
    if (error) throw error;
    await loadReviews();
}

// ========== ОТОБРАЖЕНИЕ ==========
function renderDoctors() {
    const container = document.getElementById('doctorsList');
    if (!container) return;
    
    if (!allDoctors.length) {
        container.innerHTML = '<p class="empty-message">Загрузка...</p>';
        return;
    }
    
    container.innerHTML = allDoctors.map(doc => `
        <div class="doctor-card">
            <img src="${doc.photo || 'https://via.placeholder.com/150x150?text=Doctor'}" class="doctor-photo">
            <h3>${escapeHtml(doc.name)}</h3>
            <div class="doctor-specialty">${escapeHtml(doc.specialty)}</div>
            <div class="doctor-experience">Стаж: ${escapeHtml(doc.experience || '')}</div>
            <div class="doctor-description">${escapeHtml(doc.description || '')}</div>
            <div class="doctor-schedule">⏰ ${escapeHtml(doc.schedule || '')}</div>
        </div>
    `).join('');
}

function renderAppointments() {
    const container = document.getElementById('appointmentsList');
    if (!container) return;
    
    if (!allAppointments.length) {
        container.innerHTML = '<p class="empty-message">📭 У вас пока нет записей</p>';
        return;
    }
    
    container.innerHTML = allAppointments.map(a => {
        const doctor = allDoctors.find(d => d.id === a.doctor);
        return `
            <div class="appointment-card">
                <div class="appointment-info">
                    <strong>${doctor ? doctor.name : a.doctor}</strong>
                    <p>📅 ${escapeHtml(a.date)} | ⏰ ${escapeHtml(a.time)}</p>
                    <p>👤 ${escapeHtml(a.name)} | 📞 ${escapeHtml(a.phone)}</p>
                </div>
                <button onclick="deleteAppointment('${a.id}')" class="delete-btn">❌ Отменить</button>
            </div>
        `;
    }).join('');
}

function renderReviews() {
    const container = document.getElementById('reviewsList');
    if (!container) return;
    
    if (!allReviews.length) {
        container.innerHTML = '<p class="empty-message">⭐ Пока нет отзывов</p>';
        return;
    }
    
    container.innerHTML = allReviews.map(rev => {
        // Ищем врача по doctor_id
        const doctor = allDoctors.find(d => d.id === rev.doctor_id);
        // Получаем имя врача или "Врач не найден"
        const doctorName = doctor ? doctor.name : 'Врач';
        
        return `
            <div class="review-card">
                <div class="review-header">
                    <div>
                        <span class="review-name">${escapeHtml(rev.patient_name)}</span>
                        <span class="review-doctor"> → ${escapeHtml(doctorName)}</span>
                    </div>
                    <div class="review-rating">${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}</div>
                </div>
                <div class="review-comment">${escapeHtml(rev.comment)}</div>
                <div class="review-date">${new Date(rev.created_at).toLocaleDateString('ru-RU')}</div>
            </div>
        `;
    }).join('');
}

function updateDoctorSelects() {
    const select1 = document.getElementById('doctor');
    const select2 = document.getElementById('reviewDoctor');
    
    if (!allDoctors.length) return;
    
    const options = allDoctors.map(doc => `<option value="${doc.id}">${escapeHtml(doc.name)} (${escapeHtml(doc.specialty)})</option>`).join('');
    if (select1) select1.innerHTML = '<option value="">-- Выберите врача --</option>' + options;
    if (select2) select2.innerHTML = '<option value="">-- Выберите врача --</option>' + options;
}

function updateTimeOptions() {
    const doctorId = document.getElementById('doctor').value;
    const date = document.getElementById('date').value;
    const select = document.getElementById('time');
    
    if (!doctorId || !date) {
        select.innerHTML = '<option value="">-- Сначала выберите врача и дату --</option>';
        return;
    }
    
    const booked = allAppointments.filter(a => a.doctor === doctorId && a.date === date).map(a => a.time);
    
    let html = '<option value="">-- Выберите время --</option>';
    TIMES.forEach(t => {
        if (!booked.includes(t)) html += `<option value="${t}">${t}</option>`;
    });
    
    select.innerHTML = html;
}

// ========== ДЕЙСТВИЯ ==========
window.deleteAppointment = async function(id) {
    if (!confirm('❓ Отменить запись?')) return;
    try {
        await deleteAppointmentById(id);
        showMsg('✅ Запись отменена', 'success');
    } catch (e) {
        showMsg('❌ Ошибка', 'error');
    }
};

async function bookAppointment() {
    // ПРОВЕРКА АВТОРИЗАЦИИ
    if (!currentUser) {
        showAuthModal();
        return;
    }
    
    const doctorId = document.getElementById('doctor').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    if (!doctorId || !date || !time || !name || !phone) {
        showMsg('⚠️ Заполните все поля', 'error');
        return;
    }
    
    const taken = allAppointments.some(a => a.doctor === doctorId && a.date === date && a.time === time);
    if (taken) {
        showMsg('❌ Это время занято', 'error');
        updateTimeOptions();
        return;
    }
    
    try {
        await saveAppointment({ doctor: doctorId, date, time, name, phone });
        document.getElementById('doctor').value = '';
        document.getElementById('date').value = '';
        document.getElementById('time').innerHTML = '<option value="">-- Выберите время --</option>';
        document.getElementById('name').value = '';
        document.getElementById('phone').value = '';
        showMsg('✅ Вы успешно записаны!', 'success');
    } catch (e) {
        showMsg('❌ Ошибка', 'error');
    }
}

async function submitReview() {
    const doctorId = document.getElementById('reviewDoctor').value;
    const name = document.getElementById('reviewName').value.trim();
    const comment = document.getElementById('reviewComment').value.trim();
    
    if (!doctorId) { showMsg('⚠️ Выберите врача', 'error'); return; }
    if (!name) { showMsg('⚠️ Введите имя', 'error'); return; }
    if (!comment) { showMsg('⚠️ Напишите отзыв', 'error'); return; }
    
    try {
        await saveReview({ doctor_id: doctorId, patient_name: name, rating: selectedRating, comment });
        document.getElementById('reviewDoctor').value = '';
        document.getElementById('reviewName').value = '';
        document.getElementById('reviewComment').value = '';
        showMsg('⭐ Спасибо за отзыв!', 'success');
    } catch (e) {
        showMsg('❌ Ошибка', 'error');
    }
}

// ========== ЗВЕЗДЫ ==========
function initStars() {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating);
            stars.forEach((s, i) => {
                if (i < selectedRating) s.classList.add('active');
                else s.classList.remove('active');
            });
        });
    });
    stars.forEach((s, i) => { if (i < 5) s.classList.add('active'); });
}

// ========== СООБЩЕНИЯ ==========
function showMsg(text, type) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = `message ${type}`;
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ========== ДАТА ==========
const today = new Date().toISOString().split('T')[0];
if (document.getElementById('date')) {
    document.getElementById('date').min = today;
}

// ========== ВКЛАДКИ ==========
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// ========== СОБЫТИЯ ==========
document.getElementById('doctor')?.addEventListener('change', updateTimeOptions);
document.getElementById('date')?.addEventListener('change', updateTimeOptions);
document.getElementById('submitBtn')?.addEventListener('click', bookAppointment);
document.getElementById('submitReview')?.addEventListener('click', submitReview);
document.getElementById('loginBtn')?.addEventListener('click', login);
document.getElementById('registerBtn')?.addEventListener('click', register);
document.getElementById('logoutBtn')?.addEventListener('click', logout);
document.querySelector('.close')?.addEventListener('click', hideAuthModal);
window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('authModal')) hideAuthModal();
});

// ========== ЗАПУСК ==========
initStars();
checkAuth();
loadDoctors();
loadAppointments();
loadReviews();
