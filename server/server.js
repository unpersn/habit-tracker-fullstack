require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();

// Подключение к базе данных
connectDB();

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:5500', 'http://localhost:5500'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
const path = require('path');

// Отдача статических файлов из client/
app.use(express.static(path.join(__dirname, '../client')));

// Если путь не найден среди API, возвращаем index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});


// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/habits', require('./routes/habits'));

// Тестовый роут
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Сервер работает!', 
        database: 'MongoDB Atlas подключена',
        timestamp: new Date().toISOString()
    });
});

// Обработка несуществующих роутов
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Роут не найден' });
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err.stack);
    res.status(500).json({ 
        message: 'Внутренняя ошибка сервера',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 Клиент: http://localhost:${PORT}`);
    console.log(`🔗 API: http://localhost:${PORT}/api/test`);
    console.log(`🌍 Среда: ${process.env.NODE_ENV}`);
});

// Обработка неперехваченных ошибок
process.on('unhandledRejection', (err, promise) => {
    console.error('Неперехваченная ошибка Promise:', err.message);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('Неперехваченное исключение:', err.message);
    process.exit(1);
});