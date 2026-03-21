// Доступное время для записи
const availableTimes = [
    "09:00", "10:00", "11:00", "12:00", 
    "13:00", "14:00", "15:00", "16:00", "17:00"
];

// Загрузка сохраненных записей из localStorage
let appointments = JSON.parse(localStorage.getItem('appointments')) || [];

// Устанавливаем минимальную дату (сегодня)
const today = new Date().toISOString().split('T')[0];
const dateInput = document.getElementById('date');
if (dateInput) {
    dateInput.min = today;
}

// Функция для отображения доступного времени
function updateTimeOptions() {
    const doctor = document.getElementById('doctor').value;
    const date = document.getElementById('date').value;
    const timeSelect = document.getElementById('time');
    
    if (!doctor || !date) {
        timeSelect.innerHTML = '<option value="">-- Сначала выберите врача и дату --</option>';
        return;
    }
    
    // Получаем уже занятые слоты для выбранного врача и даты
    const bookedTimes = appointments
        .filter(app => app.doctor === doctor && app.date === date)
        .map(app => app.time);
    
    // Формируем доступные слоты
    let options = '<option value="">-- Выберите время --</option>';
    availableTimes.forEach(time => {
        if (!bookedTimes.includes(time)) {
            options += `<option value="${time}">${time}</option>`;
        }
    });
    
    if (availableTimes.length === bookedTimes.length) {
        options = '<option value="">-- На этот день нет свободного времени --</option>';
    }
    
    timeSelect.innerHTML = options;
}

// Функция для отображения всех записей
function renderAppointments() {
    const container = document.getElementById('appointmentsList');
    
    if (!container) return;
    
    if (appointments.length === 0) {
        container.innerHTML = '<p class="empty-message">У вас пока нет записей</p>';
        return;
    }
    
    container.innerHTML = '';
    appointments.forEach((app, index) => {
        const card = document.createElement('div');
        card.className = 'appointment-card';
        card.innerHTML = `
            <div class="appointment-info">
                <strong>${escapeHtml(app.doctor)}</strong>
                <p>📅 ${escapeHtml(app.date)} | ⏰ ${escapeHtml(app.time)}</p>
                <p>👤 ${escapeHtml(app.name)} | 📞 ${escapeHtml(app.phone)}</p>
            </div>
            <button class="delete-btn" data-index="${index}">Отменить</button>
        `;
        
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', function() {
            deleteAppointment(parseInt(this.dataset.index));
        });
        
        container.appendChild(card);
    });
}

// Защита от XSS
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39');
}

// Удаление записи
function deleteAppointment(index) {
    if (confirm('Вы уверены, что хотите отменить запись?')) {
        appointments.splice(index, 1);
        localStorage.setItem('appointments', JSON.stringify(appointments));
        renderAppointments();
        updateTimeOptions();
        showMessage('✅ Запись успешно отменена', 'success');
    }
}

// Показ сообщений
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;
    
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
        messageDiv.className = 'message';
    }, 3000);
}

// Запись на прием
function bookAppointment() {
    const doctor = document.getElementById('doctor').value;
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    // Проверка всех полей
    if (!doctor) {
        showMessage('Пожалуйста, выберите врача', 'error');
        return;
    }
    if (!date) {
        showMessage('Пожалуйста, выберите дату', 'error');
        return;
    }
    if (!time) {
        showMessage('Пожалуйста, выберите время', 'error');
        return;
    }
    if (!name) {
        showMessage('Пожалуйста, введите ваше имя', 'error');
        return;
    }
    if (!phone) {
        showMessage('Пожалуйста, введите номер телефона', 'error');
        return;
    }
    
    // Проверка, не занято ли это время
    const isBooked = appointments.some(app => 
        app.doctor === doctor && app.date === date && app.time === time
    );
    
    if (isBooked) {
        showMessage('Это время уже занято. Пожалуйста, выберите другое время', 'error');
        updateTimeOptions();
        return;
    }
    
    // Создаем новую запись
    const newAppointment = {
        doctor,
        date,
        time,
        name,
        phone,
        createdAt: new Date().toISOString()
    };
    
    appointments.push(newAppointment);
    localStorage.setItem('appointments', JSON.stringify(appointments));
    
    // Очищаем форму
    document.getElementById('doctor').value = '';
    document.getElementById('date').value = '';
    document.getElementById('time').innerHTML = '<option value="">-- Сначала выберите врача и дату --</option>';
    document.getElementById('name').value = '';
    document.getElementById('phone').value = '';
    
    renderAppointments();
    showMessage('✅ Вы успешно записались на прием!', 'success');
}

// Добавляем обработчики событий
const doctorSelect = document.getElementById('doctor');
const dateSelect = document.getElementById('date');
const submitBtn = document.getElementById('submitBtn');

if (doctorSelect) {
    doctorSelect.addEventListener('change', updateTimeOptions);
}
if (dateSelect) {
    dateSelect.addEventListener('change', updateTimeOptions);
}
if (submitBtn) {
    submitBtn.addEventListener('click', bookAppointment);
}

// Инициализация при загрузке страницы
renderAppointments();
