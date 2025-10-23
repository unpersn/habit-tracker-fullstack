const API_BASE_URL = 'http://localhost:5000/api';

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.init();
    }

    init() {
        // Если мы на странице входа
        if (window.location.pathname.includes('login.html')) {
            this.initAuthPage();
        } else {
            // Если мы на главной странице, проверяем авторизацию
            this.checkAuth();
        }
    }

    initAuthPage() {
        console.log('🔐 Инициализация страницы авторизации');
        
        // Если уже авторизован, перенаправляем на главную
        if (this.token && this.user) {
            console.log('✅ Пользователь уже авторизован, перенаправляем');
            window.location.href = 'index.html';
            return;
        }

        this.bindAuthEvents();
    }

    bindAuthEvents() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }

        console.log('🎯 События авторизации привязаны');
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showMessage('Заполните все поля', 'error');
            return;
        }

        console.log('🔑 Попытка входа для:', email);

        try {
            this.showLoading(true);
            
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            console.log('📡 Ответ сервера на вход:', response.status);

            if (response.ok) {
                console.log('✅ Успешный вход');
                this.setAuth(data.token, data.user);
                this.showMessage('Успешный вход!', 'success');
                
                // Перенаправляем на главную страницу
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
                
            } else {
                console.log('❌ Ошибка входа:', data.message);
                this.showMessage(data.message || 'Ошибка входа', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка подключения при входе:', error);
            this.showMessage('Ошибка подключения к серверу', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;

        // Валидация
        if (!username || !email || !password) {
            this.showMessage('Заполните все поля', 'error');
            return;
        }

        if (username.length < 3) {
            this.showMessage('Имя пользователя должно содержать минимум 3 символа', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showMessage('Введите корректный email', 'error');
            return;
        }

        console.log('📝 Попытка регистрации для:', email);

        try {
            this.showLoading(true);
            
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();
            console.log('📡 Ответ сервера на регистрацию:', response.status);

            if (response.ok) {
                console.log('✅ Успешная регистрация');
                this.setAuth(data.token, data.user);
                this.showMessage('Регистрация успешна!', 'success');
                
                // Перенаправляем на главную страницу
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
                
            } else {
                console.log('❌ Ошибка регистрации:', data.message);
                this.showMessage(data.message || 'Ошибка регистрации', 'error');
            }
        } catch (error) {
            console.error('❌ Ошибка подключения при регистрации:', error);
            this.showMessage('Ошибка подключения к серверу', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    setAuth(token, user) {
        console.log('💾 Сохранение данных авторизации для:', user.username);
        
        this.token = token;
        this.user = user;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }

    logout() {
        console.log('🚪 Выход из системы');
        
        this.token = null;
        this.user = null;
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        window.location.href = 'login.html';
    }

    checkAuth() {
        console.log('🔍 Проверка авторизации');
        
        if (!this.token || !this.user) {
            console.log('❌ Не авторизован, перенаправляем на login');
            window.location.href = 'login.html';
            return false;
        }
        
        console.log('✅ Авторизован как:', this.user.username);
        return true;
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }

    showMessage(message, type) {
        const messageEl = document.getElementById('authMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message ${type}`;
            messageEl.style.display = 'block';
            
            // Автоматически скрываем сообщение через 5 секунд
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    }

    showLoading(loading) {
        const forms = document.querySelectorAll('.auth-form');
        const buttons = document.querySelectorAll('.auth-btn');
        
        forms.forEach(form => {
            if (loading) {
                form.classList.add('loading');
            } else {
                form.classList.remove('loading');
            }
        });
        
        buttons.forEach(button => {
            button.disabled = loading;
            if (loading) {
                button.textContent = 'Загрузка...';
            } else {
                // Восстанавливаем текст кнопок
                if (button.closest('#loginForm')) {
                    button.textContent = 'Войти';
                } else if (button.closest('#registerForm')) {
                    button.textContent = 'Зарегистрироваться';
                }
            }
        });
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Метод для проверки токена на сервере (опционально)
    async validateToken() {
        if (!this.token) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.user = data.user;
                localStorage.setItem('user', JSON.stringify(data.user));
                return true;
            } else {
                // Токен недействителен
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Ошибка проверки токена:', error);
            return false;
        }
    }
}

// Функции для переключения табов на странице входа
function showLogin() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    if (loginForm) loginForm.classList.remove('hidden');
    if (registerForm) registerForm.classList.add('hidden');
    
    if (tabBtns.length >= 2) {
        tabBtns[0].classList.add('active');
        tabBtns[1].classList.remove('active');
    }
    
    // Очищаем сообщения
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
}

function showRegister() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    if (loginForm) loginForm.classList.add('hidden');
    if (registerForm) registerForm.classList.remove('hidden');
    
    if (tabBtns.length >= 2) {
        tabBtns[0].classList.remove('active');
        tabBtns[1].classList.add('active');
    }
    
    // Очищаем сообщения
    const messageEl = document.getElementById('authMessage');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
}

// Инициализация менеджера авторизации
console.log('🔐 Загрузка AuthManager');

// Создаем глобальную переменную для доступа из других скриптов
let authManager;

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, создаем AuthManager');
    authManager = new AuthManager();
});

// Если DOM уже загружен
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('📄 DOM уже готов, создаем AuthManager');
    authManager = new AuthManager();
}

// Экспортируем для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}