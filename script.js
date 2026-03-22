// ВАШИ КЛЮЧИ ИЗ SUPABASE
const SUPABASE_URL = 'https://pybzxnewptledlezyyuj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Ynp4bmV3cHRsZWRsZXp5eXVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxODI1MjAsImV4cCI6MjA4OTc1ODUyMH0.jdYcl1BuBcgE2axHTdAiq06ANMmKaO3_6zrA94zMQGM';

// СОЗДАЕМ КЛИЕНТ
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const TIMES = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
let allAppointments = [];

// ДАТА
const today = new Date().toISOString().split('T')[0];
const dateInput = document.getElementById('date');
if (dateInput) dateInput.min = today;

// ЗАГРУЗКА
async function load() {
    try {
        const { data, error } = await sb.from('appointments').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allAppointments = data || [];
        render();
        updateTimes();
        console.log('Загружено:', allAppointments.length);
    } catch (err) {
        console.error(err);
        document.getElementById('appointmentsList').innerHTML = '<p class="empty-message">Ошибка загрузки</p>';
    }
}

// ОБНОВЛЕНИЕ ВРЕМЕНИ
function updateTimes() {
    const doctor = document.getElementById('doctor').value;
    const date = document.getElementById('date').value;
    const select = document.getElementById('time');
    
    if (!doctor || !date) {
        select.innerHTML = '<option value="">-- Сначала выберите врача и дату --</option>';
        return;
    }
    
    const booked = allAppointments.filter(a => a.doctor === doctor && a.date === date).map(a => a.time);
    
    let html = '<option value="">-- Выберите время --</option>';
    TIMES.forEach(t => {
        if (!booked.includes(t)) html += `<option value="${t}">${t}</option>`;
    });
    
    if (TIMES.length === booked.length) html = '<option value="">-- Нет свободного времени --</option>';
    select.innerHTML = html;
}

// ОТОБРАЖЕНИЕ ЗАПИСЕЙ
function render() {
    const container = document.getElementById('appointmentsList');
    if (!container) return;
    
    if (allAppointments.length === 0) {
        container.innerHTML = '<p class="empty-message">Нет записей</p>';
        return;
    }
    
    container.innerHTML = '';
    allAppointments.forEach(a => {
        const div = document.createElement('div');
        div.className = 'appointment-card';
        div.innerHTML = `
            <div class="appointment-info">
                <strong>${a.doctor}</strong>
                <p>📅 ${a.date} | ⏰ ${a.time}</p>
                <p>👤 ${a.name} | 📞 ${a.phone}</p>
            </div>
            <button onclick="remove('${a.id}')" class="delete-btn">Отменить</button>
        `;
        container.appendChild(div);
    });
}

// УДАЛЕНИЕ
window.remove = async function(id) {
    if (!confirm('Отменить запись?')) return;
    try {
        await sb.from('appointments').delete().eq('id', id);
        await load();
        showMsg('Запись отменена', 'success');
    } catch (err) {
        showMsg('Ошибка', 'error');
    }
};

// СООБЩЕНИЕ
function showMsg(text, type) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.className = `message ${type}`;
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 3000);
}

// ЗАПИСЬ
async function book() {
    const doctor = document.getElementById('doctor').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    if (!doctor || !date || !time || !name || !phone) {
        showMsg('Заполните все поля', 'error');
        return;
    }
    
    const taken = allAppointments.some(a => a.doctor === doctor && a.date === date && a.time === time);
    if (taken) {
        showMsg('Это время занято', 'error');
        updateTimes();
        return;
    }
    
    try {
        // Сохраняем запись
        const { error } = await sb.from('appointments').insert([{ doctor, date, time, name, phone }]);
        
        if (error) {
            console.error('Ошибка Supabase:', error);
            showMsg('Ошибка: ' + error.message, 'error');
            return;
        }
        
        // Перезагружаем список
        await load();
        
        // Очищаем форму
        document.getElementById('doctor').value = '';
        document.getElementById('date').value = '';
        document.getElementById('time').innerHTML = '<option value="">-- Выберите время --</option>';
        document.getElementById('name').value = '';
        document.getElementById('phone').value = '';
        
        showMsg('✅ Вы успешно записались!', 'success');
    } catch (err) {
        console.error('Ошибка:', err);
        showMsg('Ошибка при сохранении', 'error');
    }
}

// СОБЫТИЯ
document.getElementById('doctor').addEventListener('change', updateTimes);
document.getElementById('date').addEventListener('change', updateTimes);
document.getElementById('submitBtn').addEventListener('click', book);

// ЗАПУСК
load();
