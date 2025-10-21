// 🔧 Автоматическое определение API URL
const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";

console.log("🌐 API_BASE_URL:", API_BASE_URL);

class HabitTracker {
    constructor() {
        this.habits = [];
        this.authManager = null;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.init();
    }

    async init() {
        console.log('🚀 Инициализация HabitTracker');
        
        try {
            // Проверяем авторизацию
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            
            if (!token || !user) {
                console.log('❌ Нет токена, перенаправляем на login');
                window.location.href = 'login.html';
                return;
            }

            this.user = JSON.parse(user);
            this.token = token;
            
            console.log('✅ Пользователь найден:', this.user.username);

            // Скрываем загрузку, показываем приложение
            this.hideLoading();
            
            // Инициализируем интерфейс
            this.renderUserInfo();
            this.bindEvents();
            this.initCalendar();
            
            // Загружаем данные и ждем их загрузки
            await this.loadHabits();
            
            // Только после загрузки данных рендерим все
            this.render();
            this.updateStats();
            this.renderCalendar();
            
            console.log('✅ Инициализация завершена. Привычек загружено:', this.habits.length);
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            this.showError(error.message);
        }
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainApp = document.getElementById('mainApp');
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (mainApp) mainApp.style.display = 'block';
    }

    showError(message) {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainApp = document.getElementById('mainApp');
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (mainApp) mainApp.style.display = 'none';
        
        if (errorMessage && errorText) {
            errorText.textContent = message;
            errorMessage.style.display = 'flex';
        }
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    renderUserInfo() {
        const header = document.querySelector('header');
        if (!header) return;
        
        // Удаляем старую информацию
        const existingUserInfo = header.querySelector('.user-info');
        if (existingUserInfo) {
            existingUserInfo.remove();
        }
        
        // Добавляем новую
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <span class="user-welcome">👋 Привет, ${this.user.username}!</span>
            <button class="logout-btn" onclick="habitTracker.logout()">Выйти</button>
        `;
        header.appendChild(userInfo);
    }

    bindEvents() {
        const form = document.getElementById('habitForm');
        if (form) {
            form.addEventListener('submit', (e) => this.addHabit(e));
        }
    }

    async loadHabits() {
        console.log('📥 Загрузка привычек...');
        
        try {
            const response = await fetch(`${API_BASE_URL}/habits`, {
                headers: this.getAuthHeaders()
            });

            console.log('📡 Ответ сервера на загрузку привычек:', response.status);

            if (response.ok) {
                const data = await response.json();
                this.habits = data;
                console.log('✅ Привычки успешно загружены:', this.habits.length);
                console.log('📋 Данные привычек:', this.habits);
            } else if (response.status === 401) {
                console.log('❌ Токен недействителен, выходим');
                this.logout();
                return;
            } else {
                const errorText = await response.text();
                console.error('❌ Ошибка загрузки привычек:', response.status, errorText);
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Ошибка подключения при загрузке привычек:', error);
            this.habits = [];
            // Показываем ошибку пользователю
            alert('Ошибка загрузки привычек. Проверьте подключение к интернету.');
        }
    }

    async addHabit(e) {
        e.preventDefault();
        
        const input = document.getElementById('habitInput');
        const habitName = input.value.trim();

        if (!habitName) return;

        console.log('➕ Добавляем привычку:', habitName);

        try {
            const response = await fetch(`${API_BASE_URL}/habits`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ name: habitName })
            });

            console.log('📡 Ответ сервера на добавление:', response.status);

            if (response.ok) {
                const newHabit = await response.json();
                console.log('✅ Новая привычка создана:', newHabit);
                
                this.habits.unshift(newHabit);
                this.render();
                this.updateStats();
                this.renderCalendar();
                input.value = '';
                
                console.log('📊 Всего привычек теперь:', this.habits.length);
            } else {
                const errorText = await response.text();
                console.error('❌ Ошибка добавления привычки:', errorText);
                alert('Ошибка добавления привычки');
            }
        } catch (error) {
            console.error('❌ Ошибка подключения при добавлении:', error);
            alert('Ошибка подключения к серверу');
        }
    }

    async deleteHabit(id) {
        if (!confirm('Удалить привычку?')) return;

        console.log('🗑️ Удаляем привычку:', id);

        try {
            const response = await fetch(`${API_BASE_URL}/habits/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            console.log('📡 Ответ сервера на удаление:', response.status);

            if (response.ok) {
                this.habits = this.habits.filter(habit => habit._id !== id);
                this.render();
                this.updateStats();
                this.renderCalendar();
                console.log('✅ Привычка удалена. Осталось:', this.habits.length);
            } else {
                console.error('❌ Ошибка удаления привычки');
            }
        } catch (error) {
            console.error('❌ Ошибка подключения при удалении:', error);
        }
    }

    async toggleHabitCompletion(id) {
        console.log('🔄 Переключаем выполнение привычки:', id);

        try {
            const response = await fetch(`${API_BASE_URL}/habits/${id}/complete`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            console.log('📡 Ответ сервера на переключение:', response.status);

            if (response.ok) {
                const updatedHabit = await response.json();
                console.log('✅ Привычка обновлена:', updatedHabit);
                
                const habitIndex = this.habits.findIndex(h => h._id === id);
                if (habitIndex > -1) {
                    this.habits[habitIndex] = updatedHabit;
                    this.render();
                    this.updateStats();
                    this.renderCalendar();
                }
            } else {
                console.error('❌ Ошибка переключения привычки');
            }
        } catch (error) {
            console.error('❌ Ошибка подключения при переключении:', error);
        }
    }

    logout() {
        console.log('🚪 Выходим из системы');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    isCompletedToday(habit) {
        if (!habit.completions || habit.completions.length === 0) {
            return false;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return habit.completions.some(completion => {
            const completionDate = new Date(completion.date);
            completionDate.setHours(0, 0, 0, 0);
            return completionDate.getTime() === today.getTime();
        });
    }

    render() {
        const habitsList = document.getElementById('habitsList');
        const emptyState = document.getElementById('emptyState');

        if (!habitsList || !emptyState) {
            console.log('❌ Не найдены элементы для рендера привычек');
            return;
        }

        console.log('🎨 Рендерим привычки. Количество:', this.habits.length);

        if (this.habits.length === 0) {
            habitsList.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        habitsList.style.display = 'block';
        emptyState.style.display = 'none';
        habitsList.innerHTML = '';

        this.habits.forEach(habit => {
            const habitElement = document.createElement('div');
            habitElement.className = 'habit-item';
            
            const isCompleted = this.isCompletedToday(habit);
            
            habitElement.innerHTML = `
                <div class="habit-header">
                    <span class="habit-name">${habit.name}</span>
                    <div class="habit-actions">
                        <button 
                            class="btn btn-complete ${isCompleted ? 'completed' : ''}"
                            onclick="habitTracker.toggleHabitCompletion('${habit._id}')"
                        >
                            ${isCompleted ? '✓ Выполнено' : 'Выполнить'}
                        </button>
                        <button 
                            class="btn btn-delete"
                            onclick="habitTracker.deleteHabit('${habit._id}')"
                        >
                            Удалить
                        </button>
                    </div>
                </div>
                <div class="habit-progress">
                    <span class="progress-info">
                        Выполнено: ${habit.completions ? habit.completions.length : 0} раз
                    </span>
                    <span class="streak">
                        🔥 Серия: ${habit.streak || 0} дней
                    </span>
                </div>
            `;

            habitsList.appendChild(habitElement);
        });

        console.log('✅ Привычки отрендерены');
    }

    updateStats() {
        const totalHabits = this.habits.length;
        const completedToday = this.habits.filter(habit => 
            this.isCompletedToday(habit)
        ).length;
        const bestStreak = this.habits.length > 0 ? 
            Math.max(...this.habits.map(h => h.bestStreak || 0)) : 0;

        const totalHabitsEl = document.getElementById('totalHabits');
        const completedTodayEl = document.getElementById('completedToday');
        const streakCountEl = document.getElementById('streakCount');

        if (totalHabitsEl) totalHabitsEl.textContent = totalHabits;
        if (completedTodayEl) completedTodayEl.textContent = completedToday;
        if (streakCountEl) streakCountEl.textContent = bestStreak;

        console.log('📊 Статистика обновлена:', { totalHabits, completedToday, bestStreak });
    }

    // === КАЛЕНДАРЬ ===
    
    initCalendar() {
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.changeMonth(-1));
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.changeMonth(1));
        }

        console.log('📅 Календарь инициализирован');
    }

    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderCalendar();
        console.log('📅 Месяц изменен:', this.currentDate.getMonth() + 1, this.currentDate.getFullYear());
    }

    renderCalendar() {
        const currentMonthEl = document.getElementById('currentMonth');
        const calendarGrid = document.getElementById('calendarGrid');
        
        if (!currentMonthEl || !calendarGrid) {
            console.log('❌ Элементы календаря не найдены');
            return;
        }

        console.log('📅 Рендерим календарь для:', this.currentDate.getMonth() + 1, this.currentDate.getFullYear());
        console.log('📋 Привычек для календаря:', this.habits.length);

        const months = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];

        currentMonthEl.textContent = `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        calendarGrid.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        let startDay = firstDay.getDay();
        startDay = startDay === 0 ? 6 : startDay - 1;

        // Пустые ячейки
        for (let i = 0; i < startDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyDay);
        }

        // Дни месяца
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            const currentDay = new Date(year, month, day);
            const today = new Date();
            
            if (this.isSameDay(currentDay, today)) {
                dayElement.classList.add('today');
            }

            const dayStatus = this.getDayStatus(currentDay);
            console.log(`📅 День ${day}: привычек ${dayStatus.total}, выполнено ${dayStatus.completed}`);
            
            if (dayStatus.hasHabits) {
                if (dayStatus.completionRate === 1) {
                    dayElement.classList.add('completed');
                } else if (dayStatus.completionRate > 0) {
                    dayElement.classList.add('partial');
                }
            }

            dayElement.addEventListener('click', () => this.showDayModal(currentDay));
            
            calendarGrid.appendChild(dayElement);
        }

        console.log('✅ Календарь отрендерен');
    }

    getDayStatus(date) {
        const dayHabits = this.getHabitsForDay(date);
        
        if (dayHabits.length === 0) {
            return { hasHabits: false, completionRate: 0, total: 0, completed: 0 };
        }

        const completedCount = dayHabits.filter(habit => 
            this.isHabitCompletedOnDay(habit, date)
        ).length;

        return {
            hasHabits: true,
            completionRate: completedCount / dayHabits.length,
            total: dayHabits.length,
            completed: completedCount
        };
    }

    getHabitsForDay(date) {
        // Привычка доступна для дня, если она была создана до или в этот день
        return this.habits.filter(habit => {
            const habitCreated = new Date(habit.createdAt);
            habitCreated.setHours(0, 0, 0, 0);
            
            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);
            
            return habitCreated <= checkDate;
        });
    }

    isHabitCompletedOnDay(habit, date) {
        if (!habit.completions || habit.completions.length === 0) {
            return false;
        }
        
        return habit.completions.some(completion => {
            const completionDate = new Date(completion.date);
            return this.isSameDay(completionDate, date);
        });
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    showDayModal(date) {
        const modal = document.getElementById('dayModal');
        const modalDate = document.getElementById('modalDate');
        const dayHabits = document.getElementById('dayHabits');
        const noDayHabits = document.getElementById('noDayHabits');
        
        if (!modal || !modalDate || !dayHabits) {
            console.log('❌ Элементы модального окна не найдены');
            return;
        }

        this.selectedDate = date;
        
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        modalDate.textContent = date.toLocaleDateString('ru-RU', options);

        const habitsForDay = this.getHabitsForDay(date);
        
        console.log('📅 Показываем день:', date, 'Привычек:', habitsForDay.length);
        
        if (habitsForDay.length === 0) {
            dayHabits.style.display = 'none';
            noDayHabits.style.display = 'block';
        } else {
            dayHabits.style.display = 'block';
            noDayHabits.style.display = 'none';
            
            dayHabits.innerHTML = '';
            
            habitsForDay.forEach(habit => {
                const isCompleted = this.isHabitCompletedOnDay(habit, date);
                
                const habitElement = document.createElement('div');
                habitElement.className = `day-habit ${isCompleted ? 'completed' : 'not-completed'}`;
                habitElement.innerHTML = `
                    <div class="habit-status">
                        <span class="status-icon">${isCompleted ? '✅' : '❌'}</span>
                        <span class="habit-name">${habit.name}</span>
                    </div>
                    <div class="habit-meta">
                        <span class="habit-streak">Серия: ${habit.streak || 0}</span>
                    </div>
                `;
                
                dayHabits.appendChild(habitElement);
            });
        }

        modal.style.display = 'flex';
    }

    closeDayModal() {
        const modal = document.getElementById('dayModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.selectedDate = null;
    }
}

// Закрытие модального окна при клике вне его
window.addEventListener('click', (e) => {
    const modal = document.getElementById('dayModal');
    if (e.target === modal && window.habitTracker) {
        window.habitTracker.closeDayModal();
    }
});

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, создаем HabitTracker');
    window.habitTracker = new HabitTracker();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('📄 DOM уже готов, создаем HabitTracker');
    window.habitTracker = new HabitTracker();
}