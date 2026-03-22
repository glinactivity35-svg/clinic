// ========== КОНФИГУРАЦИЯ ==========
const SUPABASE_URL = 'https://pybzxnewptledlezyyuj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Ynp4bmV3cHRsZWRsZXp5eXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODI1MjAsImV4cCI6MjA4OTc1ODUyMH0.jdYcl1BuBcgE2axHTdAiq06ANMmKaO3_6zrA94zMQGM';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const TIMES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

// КЭШИРОВАНИЕ (уменьшает запросы в 5-10 раз)
let cache = {
    doctors: null,
    appointments: null,
    reviews: null,
    lastUpdate: 0
};

const CACHE_TIME = 60000; // 1 минута (обновляем раз в минуту)

// ========== УМНАЯ ЗАГРУЗКА (только если нужно) ==========
async function loadIfNeeded(type, force = false) {
    const now = Date.now();
    const needUpdate = force || !cache[type] || (now - cache.lastUpdate) > CACHE_TIME;
    
    if (!needUpdate) return cache[type];
    
    try {
        const { data, error } = await sb.from(type).select('*').limit(500);
        if (!error) {
            cache[type] = data;
            cache.lastUpdate = now;
            console.log(`📡 Загружено ${type}: ${data.length} записей`);
            return data;
        }
    } catch (e) {
        console.error('Ошибка', e);
    }
    return cache[type] || [];
}



// ========== ПАРАЛЛЕЛЬНАЯ ЗАГРУЗКА (одновременная, быстрее) ==========
async function loadAllData() {
    const [doctors, appointments, reviews] = await Promise.all([
        loadIfNeeded('doctors'),
        loadIfNeeded('appointments'),
        loadIfNeeded('reviews')
    ]);
    
    allDoctors = doctors;
    allAppointments = appointments;
    allReviews = reviews;
    
    renderDoctors();
    renderAppointments();
    renderReviews();
    updateDoctorSelects();
    updateTimeOptions();
}

// ========== СОХРАНЕНИЕ (только один запрос, без лишних загрузок) ==========
async function saveAppointment(data) {
    const { error } = await sb.from('appointments').insert([data]);
    if (error) throw error;
    
    // Обновляем кэш без лишнего запроса
    const newAppointment = { ...data, id: Date.now().toString(), created_at: new Date().toISOString() };
    allAppointments = [newAppointment, ...(allAppointments || [])];
    renderAppointments();
    updateTimeOptions();
    return true;
}

async function deleteAppointmentById(id) {
    const { error } = await sb.from('appointments').delete().eq('id', id);
    if (error) throw error;
    
    // Удаляем из кэша
    allAppointments = allAppointments.filter(a => a.id !== id);
    renderAppointments();
    updateTimeOptions();
    return true;
}

async function saveReview(data) {
    const { error } = await sb.from('reviews').insert([data]);
    if (error) throw error;
    
    const newReview = { ...data, id: Date.now().toString(), created_at: new Date().toISOString() };
    allReviews = [newReview, ...(allReviews || [])];
    renderReviews();
    return true;
}

// ========== ГЛОБАЛЬНЫЕ ДАННЫЕ (в памяти) ==========
let allDoctors = [];
let allAppointments = [];
let allReviews = [];

// ========== ОТОБРАЖЕНИЕ ==========
function renderDoctors() {
    const container = document.getElementById('doctorsList');
    if (!container) return;
    
    if (!allDoctors?.length) {
        container.innerHTML = '<p class="empty-message">👨‍⚕️ Загрузка...</p>';
        return;
    }
    
    container.innerHTML = allDoctors.map(doc => `
        <div class="doctor-card">
            <img src="${doc.photo || 'https://via.placeholder.com/150x150?text=Doctor'}" class="doctor-photo" loading="lazy">
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
    
    if (!allAppointments?.length) {
        container.innerHTML = '<p class="empty-message">📭 У вас пока нет записей</p>';
        return;
    }
    
    container.innerHTML = allAppointments.map(a => {
        const doctor = allDoctors?.find(d => d.id === a.doctor);
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
    
    if (!allReviews?.length) {
        container.innerHTML = '<p class="empty-message">⭐ Пока нет отзывов</p>';
        return;
    }
    
    container.innerHTML = allReviews.map(rev => {
        const doctor = allDoctors?.find(d => d.id === rev.doctor_id);
        return `
            <div class="review-card">
                <div class="review-header">
                    <div>
                        <span class="review-name">${escapeHtml(rev.patient_name)}</span>
                        <span class="review-doctor"> → ${doctor ? doctor.name : 'Врач'}</span>
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
    
    if (!allDoctors?.length) return;
    
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
    
    const booked = allAppointments?.filter(a => a.doctor === doctorId && a.date === date).map(a => a.time) || [];
    
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
    const doctorId = document.getElementById('doctor').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    if (!doctorId || !date || !time || !name || !phone) {
        showMsg('⚠️ Заполните все поля', 'error');
        return;
    }
    
    const taken = allAppointments?.some(a => a.doctor === doctorId && a.date === date && a.time === time);
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
        showMsg('✅ Вы записаны!', 'success');
    } catch (e) {
        showMsg('❌ Ошибка', 'error');
    }
}

// ========== ОТЗЫВЫ ==========
let selectedRating = 5;

function initStars() {
    const stars = document.querySelectorAll('.star');
    if (stars.length === 0) {
        console.warn('Звезды не найдены');
        return;
    }
    
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.rating);
            stars.forEach((s, i) => {
                if (i < selectedRating) s.classList.add('active');
                else s.classList.remove('active');
            });
            console.log('⭐ Выбрана оценка:', selectedRating);
        });
    });
    
    // Устанавливаем 5 звезд по умолчанию
    stars.forEach((s, i) => {
        if (i < 5) s.classList.add('active');
    });
    
    console.log('⭐ Звезды инициализированы');
}

async function submitReview() {
    // Получаем элементы с проверкой
    const doctorSelect = document.getElementById('reviewDoctor');
    const nameInput = document.getElementById('reviewName');
    const commentTextarea = document.getElementById('reviewComment');
    
    // Проверяем, что элементы существуют
    if (!doctorSelect) {
        console.error('❌ Элемент reviewDoctor не найден');
        showMsg('Ошибка: форма отзыва не найдена', 'error');
        return;
    }
    if (!nameInput) {
        console.error('❌ Элемент reviewName не найден');
        showMsg('Ошибка: поле имени не найдено', 'error');
        return;
    }
    if (!commentTextarea) {
        console.error('❌ Элемент reviewComment не найден');
        showMsg('Ошибка: поле отзыва не найдено', 'error');
        return;
    }
    
    const doctorId = doctorSelect.value;
    const name = nameInput.value.trim();
    const comment = commentTextarea.value.trim();
    const rating = selectedRating;
    
    console.log('📝 Отправка отзыва:', { doctorId, name, comment, rating });
    
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
    
    try {
        const { data, error } = await sb
            .from('reviews')
            .insert([{
                doctor_id: doctorId,
                patient_name: name,
                rating: rating,
                comment: comment
            }])
            .select();
        
        if (error) {
            console.error('❌ Ошибка Supabase:', error);
            showMsg('❌ Ошибка: ' + error.message, 'error');
            return;
        }
        
        console.log('✅ Отзыв сохранен:', data);
        
        // Очищаем форму
        doctorSelect.value = '';
        nameInput.value = '';
        commentTextarea.value = '';
        
        // Сбрасываем звезды
        const stars = document.querySelectorAll('.star');
        stars.forEach((s, i) => {
            if (i < 5) s.classList.add('active');
            else s.classList.remove('active');
        });
        selectedRating = 5;
        
        // Обновляем список отзывов
        await loadReviews();
        
        showMsg('⭐ Спасибо за отзыв!', 'success');
        
    } catch (err) {
        console.error('❌ Ошибка:', err);
        showMsg('❌ Ошибка при сохранении', 'error');
    }
}
async function loadReviews() {
    try {
        console.log('🔄 Загрузка отзывов...');
        
        const { data, error } = await sb
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Ошибка загрузки отзывов:', error);
            return;
        }
        
        allReviews = data || [];
        console.log('✅ Загружено отзывов:', allReviews.length);
        renderReviews();
        
    } catch (err) {
        console.error('❌ Ошибка:', err);
    }
}

// ========== СООБЩЕНИЯ ==========
function showMsg(text, type) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = `message ${type}`;
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 2000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ========== СОБЫТИЯ ==========
const today = new Date().toISOString().split('T')[0];
if (document.getElementById('date')) document.getElementById('date').min = today;

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
        
        // Загружаем только если нужно (ленивая загрузка)
        if (btn.dataset.tab === 'doctors' && !allDoctors?.length) loadAllData();
        if (btn.dataset.tab === 'reviews' && !allReviews?.length) loadAllData();
    });
});

document.getElementById('doctor')?.addEventListener('change', updateTimeOptions);
document.getElementById('date')?.addEventListener('change', updateTimeOptions);
document.getElementById('submitBtn')?.addEventListener('click', bookAppointment);
document.getElementById('submitReview')?.addEventListener('click', submitReview);

// ========== ЗАПУСК ==========
initStars();
loadAllData();
