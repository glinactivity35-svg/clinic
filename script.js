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

// ========== АВТОРИЗАЦИЯ ПО КОДУ ==========

// Показываем модальное окно
function showAuthModal() {
    const modal = document.getElementById('authModal');
    const stepEmail = document.getElementById('stepEmail');
    const stepCode = document.getElementById('stepCode');
    const authEmail = document.getElementById('authEmail');
    const authCode = document.getElementById('authCode');
    const authMessage = document.getElementById('authMessage');
    
    // Сбрасываем форму
    if (stepEmail) stepEmail.style.display = 'block';
    if (stepCode) stepCode.style.display = 'none';
    if (authEmail) authEmail.value = '';
    if (authCode) authCode.value = '';
    if (authMessage) authMessage.textContent = '';
    
    if (modal) modal.style.display = 'block';
}

function hideAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

// Отправка кода на email
async function sendCode() {
    const email = document.getElementById('authEmail').value.trim();
    const messageEl = document.getElementById('authMessage');
    
    if (!email) {
        messageEl.textContent = '❌ Введите email';
        return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
        messageEl.textContent = '❌ Введите корректный email';
        return;
    }
    
    messageEl.textContent = '⏳ Отправка кода...';
    messageEl.style.color = 'blue';
    
    try {
        const { error } = await sb.auth.signInWithOtp({
            email: email,
            options: {
                shouldCreateUser: true
            }
        });
        
        if (error) throw error;
        
        currentEmail = email;
        messageEl.style.color = 'green';
        messageEl.textContent = '✅ Код отправлен! Проверьте почту';
        
        document.getElementById('stepEmail').style.display = 'none';
        document.getElementById('stepCode').style.display = 'block';
        
    } catch (err) {
        messageEl.style.color = 'red';
        messageEl.textContent = '❌ ' + err.message;
    }
}

let currentEmail = '';

// Проверка кода
async function verifyCode() {
    const code = document.getElementById('authCode').value.trim();
    const messageEl = document.getElementById('authMessage');
    
    if (!code) {
        messageEl.textContent = '❌ Введите код';
        return;
    }
    
    messageEl.textContent = '⏳ Проверка кода...';
    messageEl.style.color = 'blue';
    
    try {
        const { data, error } = await sb.auth.verifyOtp({
            email: currentEmail,
            token: code,
            type: 'email'
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        if (userInfo) userInfo.style.display = 'flex';
        if (userEmail) userEmail.textContent = currentUser.email;
        
        hideAuthModal();
        showMsg('✅ Добро пожаловать, ' + currentUser.email, 'success');
        
    } catch (err) {
        messageEl.style.color = 'red';
        messageEl.textContent = '❌ Неверный код. Попробуйте снова';
    }
}

// Вернуться к вводу email
function backToEmail() {
    document.getElementById('stepEmail').style.display = 'block';
    document.getElementById('stepCode').style.display = 'none';
    document.getElementById('authCode').value = '';
    document.getElementById('authMessage').textContent = '';
}

// Проверка авторизации при загрузке
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
            return true;
        }
        console.log('❌ Не авторизован');
        return false;
    } catch (err) {
        console.error('Ошибка проверки сессии:', err);
        return false;
    }
}

// Выход
async function logout() {
    await sb.auth.signOut();
    currentUser = null;
    const userInfo = document.getElementById('userInfo');
    if (userInfo) userInfo.style.display = 'none';
    showMsg('👋 Вы вышли из системы', 'info');
}

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadDoctors() {
    try {
        const { data, error } = await sb.from('doctors').select('*');
        if (error) throw error;
        allDoctors = data || [];
        renderDoctors();
        updateDoctorSelects();
        console.log('✅ Загружено врачей:', allDoctors.length);
    } catch (error) {
        console.error('Ошибка загрузки врачей:', error);
    }
}

async function loadAppointments() {
    try {
        const { data, error } = await sb.from('appointments').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allAppointments = data || [];
        renderAppointments();
        updateTimeOptions();
        console.log('✅ Загружено записей:', allAppointments.length);
    } catch (error) {
        console.error('Ошибка загрузки записей:', error);
    }
}

async function loadReviews() {
    try {
        const { data, error } = await sb.from('reviews').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allReviews = data || [];
        renderReviews();
        console.log('✅ Загружено отзывов:', allReviews.length);
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
    }
}

// ========== СОХРАНЕНИЕ ==========
async function saveAppointment(data) {
    try {
        const { error } = await sb.from('appointments').insert([data]);
        if (error) throw error;
        await loadAppointments();
        return true;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showMsg('❌ Ошибка сохранения', 'error');
        return false;
    }
}

async function deleteAppointmentById(id) {
    try {
        const { error } = await sb.from('appointments').delete().eq('id', id);
        if (error) throw error;
        await loadAppointments();
        return true;
    } catch (error) {
        console.error('Ошибка удаления:', error);
        return false;
    }
}

async function saveReview(data) {
    try {
        const { error } = await sb.from('reviews').insert([data]);
        if (error) throw error;
        await loadReviews();
        return true;
    } catch (error) {
        console.error('Ошибка сохранения отзыва:', error);
        showMsg('❌ Ошибка сохранения отзыва', 'error');
        return false;
    }
}

// ========== ОТОБРАЖЕНИЕ ==========
function renderDoctors() {
    const container = document.getElementById('doctorsList');
    if (!container) return;
    
    if (!allDoctors.length) {
        container.innerHTML = '<p class="empty-message">👨‍⚕️ Загрузка врачей...</p>';
        return;
    }
    
    container.innerHTML = allDoctors.map(doc => `
        <div class="doctor-card">
            <img src="${doc.photo || 'https://via.placeholder.com/150x150?text=Doctor'}" class="doctor-photo" loading="lazy">
            <h3>${escapeHtml(doc.name)}</h3>
            <div class="doctor-specialty">${escapeHtml(doc.specialty)}</div>


<div class="doctor-experience">Стаж: ${escapeHtml(doc.experience || '')}</div>
            <div class="doctor-description">${escapeHtml(doc.description || '')}</div>
            <div class="doctor-schedule">⏰ ${escapeHtml(doc.schedule || 'График уточняйте')}</div>
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
                    <strong>${doctor ? doctor.name : 'Врач'}</strong>
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
        container.innerHTML = '<p class="empty-message">⭐ Пока нет отзывов. Будьте первым!</p>';
        return;
    }
    
    container.innerHTML = allReviews.map(rev => {
        const doctor = allDoctors.find(d => d.id === rev.doctor_id);
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
    
    if (TIMES.length === booked.length) html = '<option value="">-- На этот день нет свободного времени --</option>';
    select.innerHTML = html;
}

// ========== ДЕЙСТВИЯ ==========
window.deleteAppointment = async function(id) {
    if (!confirm('❓ Отменить запись?')) return;
    const success = await deleteAppointmentById(id);
    if (success) {
        showMsg('✅ Запись отменена', 'success');
    } else {
        showMsg('❌ Ошибка при отмене', 'error');
    }
};

async function bookAppointment() {
    // Проверка авторизации
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
        showMsg('❌ Это время уже занято', 'error');
        updateTimeOptions();
        return;
    }
    
    const success = await saveAppointment({ doctor: doctorId, date, time, name, phone });
    if (success) {
        document.getElementById('doctor').value = '';
        document.getElementById('date').value = '';
        document.getElementById('time').innerHTML = '<option value="">-- Выберите время --</option>';
        document.getElementById('name').value = '';
        document.getElementById('phone').value = '';
        showMsg('✅ Вы успешно записаны!', 'success');
    }
}

async function submitReview() {
    const doctorId = document.getElementById('reviewDoctor').value;
    const name = document.getElementById('reviewName').value.trim();
    const comment = document.getElementById('reviewComment').value.trim();
    
    if (!doctorId) {
        showMsg('⚠️ Выберите врача', 'error');
        return;
    }
    if (!name) {
        showMsg('⚠️ Введите ваше имя', 'error');
        return;
    }
    if (!comment) {
        showMsg('⚠️ Напишите отзыв', 'error');
        return;
    }
    
    const success = await saveReview({
        doctor_id: doctorId,
        patient_name: name,
        rating: selectedRating,
        comment: comment
    });
    
    if (success) {
        document.getElementById('reviewDoctor').value = '';
        document.getElementById('reviewName').value = '';
        document.getElementById('reviewComment').value = '';
        showMsg('⭐ Спасибо за отзыв!', 'success');
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
    if (!msg) return;
    msg.textContent = text;
    msg.className = `message ${type}`;
    msg.style.display = 'block';
    setTimeout(() => {
        msg.style.display = 'none';
        msg.className = 'message';
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

// Авторизация
document.getElementById('sendCodeBtn')?.addEventListener('click', sendCode);
document.getElementById('verifyCodeBtn')?.addEventListener('click', verifyCode);
document.getElementById('backToEmailBtn')?.addEventListener('click', backToEmail);
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
