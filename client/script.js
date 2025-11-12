// 🔧 Автоматическое определение API URL
const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : window.location.origin + "/api";

console.log("API_BASE_URL:", API_BASE_URL);

class HabitTracker {
    constructor() {
        this.habits = [];
        this.authManager = null;
        this.currentDate = new Date();
        this.selectedDate = new Date(); // Изначально выбран сегодняшний день
        this.init();
    }

    async init() {
        console.log('🚀 Инициализация HabitTracker');
        
        try {
            // Проверяем авторизацию
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            
            if (!token || !user) {
                console.log('Нет токена, перенаправляем на login');
                window.location.href = 'login.html';
                return;
            }

            this.user = JSON.parse(user);
            this.token = token;
            
            console.log('Пользователь найден:', this.user.username);

            // Сначала тестируем подключение к API
            await this.testConnection();

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
            this.updateSelectedDateInfo();
            
            console.log('Инициализация завершена. Привычек загружено:', this.habits.length);
            
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showError(error.message);
        }
    }

    async testConnection() {
        console.log('Тестируем подключение к API...');
        
        try {
            const response = await fetch(`${API_BASE_URL}/test`);
            console.log('Тестовый запрос - статус:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('API доступен:', data.message);
            } else {
                const text = await response.text();
                console.log('API недоступен. Ответ:', text.substring(0, 200));
                throw new Error('API недоступен');
            }
        } catch (error) {
            console.error('Ошибка подключения к API:', error);
            throw error;
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
            <span class="user-welcome">Привет, ${this.user.username}!</span>
            <button class="logout-btn" onclick="habitTracker.logout()">Выйти</button>
        `;
        header.appendChild(userInfo);
    }

    bindEvents() {
        const form = document.getElementById('habitForm');
        if (form) {
            form.addEventListener('submit', (e) => this.addHabit(e));
        }

        const backToTodayBtn = document.getElementById('backToToday');
        if (backToTodayBtn) {
            backToTodayBtn.addEventListener('click', () => this.selectToday());
        }
    }

    async loadHabits() {
        console.log('Загрузка привычек...');
        
        try {
            const response = await fetch(`${API_BASE_URL}/habits`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            console.log('Ответ сервера на загрузку привычек:', response.status);

            if (response.ok) {
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    this.habits = data;
                    console.log('Привычки успешно загружены:', this.habits.length);
                } else {
                    const text = await response.text();
                    console.log('Получен не JSON:', text.substring(0, 200));
                    throw new Error('Сервер вернул не JSON данные');
                }
            } else if (response.status === 401) {
                console.log('Токен недействителен, выходим');
                this.logout();
                return;
            } else {
                const text = await response.text();
                console.error('Ошибка загрузки привычек:', response.status, text.substring(0, 200));
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
        } catch (error) {
            console.error('Ошибка подключения при загрузке привычек:', error);
            this.habits = [];
            
            if (error.message.includes('Unexpected token')) {
                alert('Ошибка: сервер вернул HTML вместо данных. Проверьте настройки сервера.');
            } else {
                alert('Ошибка загрузки привычек: ' + error.message);
            }
        }
    }

    async addHabit(e) {
        e.preventDefault();
        
        const input = document.getElementById('habitInput');
        const habitName = input.value.trim();

        if (!habitName) return;

        console.log('Добавляем привычку:', habitName);

        try {
            const response = await fetch(`${API_BASE_URL}/habits`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ name: habitName })
            });

            console.log('Ответ сервера на добавление:', response.status);

            if (response.ok) {
                const newHabit = await response.json();
                console.log('Новая привычка создана:', newHabit);
                
                this.habits.unshift(newHabit);
                this.render();
                this.updateStats();
                this.renderCalendar();
                input.value = '';
                
                console.log('Всего привычек теперь:', this.habits.length);
            } else {
                const errorText = await response.text();
                console.error('Ошибка добавления привычки:', errorText);
                alert('Ошибка добавления привычки');
            }
        } catch (error) {
            console.error('Ошибка подключения при добавлении:', error);
            alert('Ошибка подключения к серверу');
        }
    }

    async deleteHabit(id) {
        if (!confirm('Удалить привычку?')) return;

        console.log('Удаляем привычку:', id);

        try {
            const response = await fetch(`${API_BASE_URL}/habits/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            console.log('Ответ сервера на удаление:', response.status);

            if (response.ok) {
                this.habits = this.habits.filter(habit => habit._id !== id);
                this.render();
                this.updateStats();
                this.renderCalendar();
                console.log('Привычка удалена. Осталось:', this.habits.length);
            } else {
                console.error('Ошибка удаления привычки');
            }
        } catch (error) {
            console.error('Ошибка подключения при удалении:', error);
        }
    }

    async toggleHabitCompletion(id, forDate = null) {
        const targetDate = forDate || this.selectedDate;
        console.log('Переключаем выполнение привычки:', id, 'для даты:', targetDate);

        try {
            const response = await fetch(`${API_BASE_URL}/habits/${id}/complete`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ 
                    date: targetDate.toISOString() 
                })
            });

            console.log('Ответ сервера на переключение:', response.status);

            if (response.ok) {
                const updatedHabit = await response.json();
                console.log('Привычка обновлена:', updatedHabit);
                
                const habitIndex = this.habits.findIndex(h => h._id === id);
                if (habitIndex > -1) {
                    this.habits[habitIndex] = updatedHabit;
                    this.render();
                    this.updateStats();
                    this.renderCalendar();
                }
            } else {
                console.error('Ошибка переключения привычки');
            }
        } catch (error) {
            console.error('Ошибка подключения при переключении:', error);
        }
    }

    logout() {
        console.log('Выходим из системы');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    isCompletedOnDate(habit, date) {
        if (!habit.completions || habit.completions.length === 0) {
            return false;
        }
        
        return habit.completions.some(completion => {
            const completionDate = new Date(completion.date);
            return this.isSameDay(completionDate, date);
        });
    }

    isCompletedToday(habit) {
        const today = new Date();
        return this.isCompletedOnDate(habit, today);
    }

    // Выбор даты в календаре
    selectDate(date) {
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Конец сегодняшнего дня
        
        // Не позволяем выбирать будущие дни
        if (date > today) {
            console.log('Нельзя выбрать будущий день');
            return;
        }

        this.selectedDate = new Date(date);
        console.log('Выбрана дата:', this.selectedDate);
        
        this.render();
        this.renderCalendar();
        this.updateSelectedDateInfo();
    }

    selectToday() {
        this.selectedDate = new Date();
        console.log('Возврат к сегодняшнему дню');
        
        this.render();
        this.renderCalendar();
        this.updateSelectedDateInfo();
    }

    updateSelectedDateInfo() {
        const selectedDateInfo = document.getElementById('selectedDateInfo');
        const selectedDateText = document.getElementById('selectedDateText');
        const habitsTitle = document.getElementById('habitsTitle');
        
        if (!selectedDateInfo || !selectedDateText || !habitsTitle) return;

        const today = new Date();
        const isToday = this.isSameDay(this.selectedDate, today);

        if (isToday) {
            selectedDateInfo.style.display = 'none';
            habitsTitle.textContent = 'Мои привычки';
        } else {
            selectedDateInfo.style.display = 'flex';
            
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            selectedDateText.textContent = `${this.selectedDate.toLocaleDateString('ru-RU', options)}`;
            habitsTitle.textContent = 'Привычки на выбранный день';
        }
    }

    render() {
        const habitsList = document.getElementById('habitsList');
        const emptyState = document.getElementById('emptyState');

        if (!habitsList || !emptyState) {
            console.log('Не найдены элементы для рендера привычек');
            return;
        }

        // Получаем привычки для выбранного дня
        const habitsForSelectedDay = this.getHabitsForDay(this.selectedDate);
        console.log('Рендерим привычки для выбранного дня. Количество:', habitsForSelectedDay.length);

        if (habitsForSelectedDay.length === 0) {
            habitsList.style.display = 'none';
            emptyState.style.display = 'block';
            
            const today = new Date();
            const isToday = this.isSameDay(this.selectedDate, today);
            
            if (isToday) {
                emptyState.innerHTML = '<p>У вас пока нет привычек. Добавьте первую!</p>';
            } else {
                emptyState.innerHTML = '<p>В этот день у вас не было привычек для отслеживания.</p>';
            }
            return;
        }

        habitsList.style.display = 'block';
        emptyState.style.display = 'none';
        habitsList.innerHTML = '';

        const today = new Date();
        const isToday = this.isSameDay(this.selectedDate, today);
        const isFuture = this.selectedDate > today;

        habitsForSelectedDay.forEach(habit => {
            const habitElement = document.createElement('div');
            habitElement.className = 'habit-item';
            
            const isCompleted = this.isCompletedOnDate(habit, this.selectedDate);
            
            // Определяем, можно ли редактировать
            const canEdit = !isFuture;
            
            habitElement.innerHTML = `
                <div class="habit-header">
                    <span class="habit-name">${habit.name}</span>
                    <div class="habit-actions">
                        <button 
                            class="btn btn-complete ${isCompleted ? 'completed' : ''} ${!canEdit ? 'disabled' : ''}"
                            onclick="habitTracker.toggleHabitCompletion('${habit._id}')"
                            ${!canEdit ? 'disabled' : ''}
                        >
                            ${isCompleted ? 'Выполнено' : 'Выполнить'}
                        </button>
                        ${isToday ? `
                        <button 
                            class="btn btn-delete"
                            onclick="habitTracker.deleteHabit('${habit._id}')"
                        >
                            Удалить
                        </button>
                        ` : ''}
                    </div>
                </div>
                <div class="habit-progress">
                    <span class="progress-info">
                        Выполнено: ${habit.completions ? habit.completions.length : 0} раз
                    </span>
                    <span class="streak">
                        Серия: ${habit.streak || 0} дней
                    </span>
                </div>
            `;

            habitsList.appendChild(habitElement);
        });

        console.log('Привычки отрендерены для выбранного дня');
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

        console.log('Статистика обновлена:', { totalHabits, completedToday, bestStreak });
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

        console.log('Календарь инициализирован');
    }

    changeMonth(direction) {
        this.currentDate.setMonth(this.currentDate.getMonth() + direction);
        this.renderCalendar();
        console.log('Месяц изменен:', this.currentDate.getMonth() + 1, this.currentDate.getFullYear());
    }

    renderCalendar() {
        const currentMonthEl = document.getElementById('currentMonth');
        const calendarGrid = document.getElementById('calendarGrid');
        
        if (!currentMonthEl || !calendarGrid) {
            console.log('Элементы календаря не найдены');
            return;
        }

        console.log('Рендерим календарь для:', this.currentDate.getMonth() + 1, this.currentDate.getFullYear());

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

        const today = new Date();

        // Дни месяца
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            const currentDay = new Date(year, month, day);
            
            // Проверяем различные состояния дня
            const isToday = this.isSameDay(currentDay, today);
            const isSelected = this.isSameDay(currentDay, this.selectedDate);
            const isFuture = currentDay > today;
            
            if (isToday) {
                dayElement.classList.add('today');
            }
            
            if (isSelected) {
                dayElement.classList.add('selected');
            }
            
            if (isFuture) {
                dayElement.classList.add('future');
                dayElement.style.cursor = 'not-allowed';
            } else {
                const dayStatus = this.getDayStatus(currentDay);
                
                if (dayStatus.hasHabits) {
                    if (dayStatus.completionRate === 1) {
                        dayElement.classList.add('completed');
                    } else if (dayStatus.completionRate > 0) {
                        dayElement.classList.add('partial');
                    }
                }

                dayElement.addEventListener('click', () => this.selectDate(currentDay));
            }
            
            calendarGrid.appendChild(dayElement);
        }

        console.log('Календарь отрендерен');
    }

    getDayStatus(date) {
        const dayHabits = this.getHabitsForDay(date);
        
        if (dayHabits.length === 0) {
            return { hasHabits: false, completionRate: 0, total: 0, completed: 0 };
        }

        const completedCount = dayHabits.filter(habit => 
            this.isCompletedOnDate(habit, date)
        ).length;

        return {
            hasHabits: true,
            completionRate: completedCount / dayHabits.length,
            total: dayHabits.length,
            completed: completedCount
        };
    }

    getHabitsForDay(date) {
        return this.habits.filter(habit => {
            const habitCreated = new Date(habit.createdAt);
            habitCreated.setHours(0, 0, 0, 0);
            
            const checkDate = new Date(date);
            checkDate.setHours(0, 0, 0, 0);
            
            return habitCreated <= checkDate;
        });
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, создаем HabitTracker');
    window.habitTracker = new HabitTracker();
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM уже готов, создаем HabitTracker');
    window.habitTracker = new HabitTracker();
}