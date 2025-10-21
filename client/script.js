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
            
            // Загружаем данные
            await this.loadHabits();
            this.render();
            this.updateStats();
            this.renderCalendar();
            
            console.log('✅ Инициализация завершена');
            
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

    // Инициализация календаря
    initCalendar() {
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.changeMonth(-1));
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.changeMonth(1));
        }
    }

    // Изменение месяца
    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderCalendar();
    }

    // Отрисовка календаря
    renderCalendar() {
        const currentMonthEl = document.getElementById('currentMonth');
        const calendarGrid = document.getElementById('calendarGrid');
        
        if (!currentMonthEl || !calendarGrid) return;

        const months = [
            'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
            'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
        ];

        currentMonthEl.textContent = `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        // Очищаем календарь
        calendarGrid.innerHTML = '';

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Первый день месяца
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Получаем день недели первого дня (0 = воскресенье, нужно сделать понедельник = 0)
        let startDay = firstDay.getDay();
        startDay = startDay === 0 ? 6 : startDay - 1; // Преобразуем так, чтобы понедельник был 0

        // Добавляем пустые ячейки для дней предыдущего месяца
        for (let i = 0; i < startDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyDay);
        }

        // Добавляем дни текущего месяца
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            const currentDay = new Date(year, month, day);
            const today = new Date();
            
            // Проверяем, сегодня ли это
            if (this.isSameDay(currentDay, today)) {
                dayElement.classList.add('today');
            }

            // Проверяем выполнение привычек в этот день
            const dayStatus = this.getDayStatus(currentDay);
            if (dayStatus.hasHabits) {
                if (dayStatus.completionRate === 1) {
                    dayElement.classList.add('completed');
                } else if (dayStatus.completionRate > 0) {
                    dayElement.classList.add('partial');
                }
                
                // Добавляем индикатор прогресса
                const progress = document.createElement('div');
                progress.className = 'day-progress';
                progress.style.width = `${dayStatus.completionRate * 100}%`;
                dayElement.appendChild(progress);
            }

            // Добавляем обработчик клика
            dayElement.addEventListener('click', () => this.showDayModal(currentDay));
            
            calendarGrid.appendChild(dayElement);
        }
    }

    // Получение статуса дня
    getDayStatus(date) {
        const dayHabits = this.getHabitsForDay(date);
        
        if (dayHabits.length === 0) {
            return { hasHabits: false, completionRate: 0 };
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

    // Получение привычек для конкретного дня
    getHabitsForDay(date) {
        return this.habits.filter(habit => {
            const habitCreated = new Date(habit.createdAt);
            return habitCreated <= date;
        });
    }

    // Проверка выполнения привычки в конкретный день
    isHabitCompletedOnDay(habit, date) {
        return habit.completions.some(completion => {
            const completionDate = new Date(completion.date);
            return this.isSameDay(completionDate, date);
        });
    }

    // Проверка, одинаковые ли дни
    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    // Показ модального окна для дня
    showDayModal(date) {
        const modal = document.getElementById('dayModal');
        const modalDate = document.getElementById('modalDate');
        const dayHabits = document.getElementById('dayHabits');
        const noDayHabits = document.getElementById('noDayHabits');
        
        if (!modal || !modalDate || !dayHabits) return;

        this.selectedDate = date;
        
        // Форматируем дату
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        modalDate.textContent = date.toLocaleDateString('ru-RU', options);

        // Получаем привычки для этого дня
        const habitsForDay = this.getHabitsForDay(date);
        
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

    // Закрытие модального окна
    closeDayModal() {
        const modal = document.getElementById('dayModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.selectedDate = null;
    }

    async loadHabits() {
        console.log('📥 Загрузка привычек...');
        
        try {
            const response = await fetch(`${API_BASE_URL}/habits`, {
                headers: this.getAuthHeaders()
            });

            console.log('📡 Ответ сервера:', response.status);

            if (response.ok) {
                this.habits = await response.json();
                console.log('✅ Привычки загружены:', this.habits.length);
            } else if (response.status === 401) {
                console.log('❌ Токен недействителен, выходим');
                this.logout();
                return;
            } else {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки привычек:', error);
            this.habits = [];
        }
    }

    async addHabit(e) {
        e.preventDefault();
        
        const input = document.getElementById('habitInput');
        const habitName = input.value.trim();

        if (!habitName) return;

        try {
            const response = await fetch(`${API_BASE_URL}/habits`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ name: habitName })
            });

            if (response.ok) {
                const newHabit = await response.json();
                this.habits.unshift(newHabit);
                this.render();
                this.updateStats();
                this.renderCalendar(); // Обновляем календарь
                input.value = '';
            } else {
                alert('Ошибка добавления привычки');
            }
        } catch (error) {
            console.error('Ошибка добавления привычки:', error);
            alert('Ошибка подключения к серверу');
        }
    }

    async deleteHabit(id) {
        if (!confirm('Удалить привычку?')) return;

        try {
            const response = await fetch(`${API_BASE_URL}/habits/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                this.habits = this.habits.filter(habit => habit._id !== id);
                this.render();
                this.updateStats();
                this.renderCalendar(); // Обновляем календарь
            }
        } catch (error) {
            console.error('Ошибка удаления:', error);
        }
    }

    async toggleHabitCompletion(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/habits/${id}/complete`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const updatedHabit = await response.json();
                const habitIndex = this.habits.findIndex(h => h._id === id);
                if (habitIndex > -1) {
                    this.habits[habitIndex] = updatedHabit;
                    this.render();
                    this.updateStats();
                    this.renderCalendar(); // Обновляем календарь
                }
            }
        } catch (error) {
            console.error('Ошибка отметки выполнения:', error);
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    isCompletedToday(habit) {
        const today = new Date().toDateString();
        return habit.completions.some(
            completion => new Date(completion.date).toDateString() === today
        );
    }

    render() {
        const habitsList = document.getElementById('habitsList');
        const emptyState = document.getElementById('emptyState');

        if (!habitsList || !emptyState) return;

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
                        Выполнено: ${habit.completions.length} раз
                    </span>
                    <span class="streak">
                        🔥 Серия: ${habit.streak || 0} дней
                    </span>
                </div>
            `;

            habitsList.appendChild(habitElement);
        });
    }

    updateStats() {
        const totalHabits = this.habits.length;
        const completedToday = this.habits.filter(habit => 
            this.isCompletedToday(habit)
        ).length;
        const bestStreak = Math.max(0, ...this.habits.map(h => h.bestStreak || 0));

        const totalHabitsEl = document.getElementById('totalHabits');
        const completedTodayEl = document.getElementById('completedToday');
        const streakCountEl = document.getElementById('streakCount');

        if (totalHabitsEl) totalHabitsEl.textContent = totalHabits;
        if (completedTodayEl) completedTodayEl.textContent = completedToday;
        if (streakCountEl) streakCountEl.textContent = bestStreak;
    }
}

// Закрытие модального окна при клике вне его
window.addEventListener('click', (e) => {
    const modal = document.getElementById('dayModal');
    if (e.target === modal) {
        if (window.habitTracker) {
            window.habitTracker.closeDayModal();
        }
    }
});

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, создаем HabitTracker');
    window.habitTracker = new HabitTracker();
});

// Если DOM уже загружен
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('📄 DOM уже готов, создаем HabitTracker');
    window.habitTracker = new HabitTracker();
}