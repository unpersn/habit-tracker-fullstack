const express = require('express');
const Habit = require('../models/Habit');
const auth = require('../middleware/auth');

const router = express.Router();

// Получить все привычки пользователя
router.get('/', auth, async (req, res) => {
    try {
        const habits = await Habit.find({ 
            user: req.user._id, 
            isActive: true 
        }).sort({ createdAt: -1 });

        res.json(habits);
    } catch (error) {
        console.error('Ошибка получения привычек:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Создать новую привычку
router.post('/', auth, async (req, res) => {
    try {
        const { name, description } = req.body;

        const habit = new Habit({
            name,
            description,
            user: req.user._id
        });

        await habit.save();
        res.status(201).json(habit);
    } catch (error) {
        console.error('Ошибка создания привычки:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Отметить выполнение привычки
router.post('/:id/complete', auth, async (req, res) => {
    try {
        const habit = await Habit.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!habit) {
            return res.status(404).json({ message: 'Привычка не найдена' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Проверяем, выполнена ли привычка сегодня
        const todayCompletion = habit.completions.find(completion => {
            const completionDate = new Date(completion.date);
            completionDate.setHours(0, 0, 0, 0);
            return completionDate.getTime() === today.getTime();
        });

        if (todayCompletion) {
            // Убираем выполнение
            habit.completions = habit.completions.filter(completion => {
                const completionDate = new Date(completion.date);
                completionDate.setHours(0, 0, 0, 0);
                return completionDate.getTime() !== today.getTime();
            });
        } else {
            // Добавляем выполнение
            habit.completions.push({
                date: new Date(),
                note: req.body.note || ''
            });
        }

        // Обновляем серии
        updateStreaks(habit);
        await habit.save();

        res.json(habit);
    } catch (error) {
        console.error('Ошибка отметки выполнения:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Удалить привычку
router.delete('/:id', auth, async (req, res) => {
    try {
        const habit = await Habit.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!habit) {
            return res.status(404).json({ message: 'Привычка не найдена' });
        }

        habit.isActive = false;
        await habit.save();

        res.json({ message: 'Привычка удалена' });
    } catch (error) {
        console.error('Ошибка удаления привычки:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Функция обновления серий
function updateStreaks(habit) {
    if (habit.completions.length === 0) {
        habit.streak = 0;
        return;
    }

    const sortedCompletions = habit.completions
        .map(c => new Date(c.date))
        .sort((a, b) => b - a);

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastCompletion = sortedCompletions[0];
    lastCompletion.setHours(0, 0, 0, 0);

    if (lastCompletion.getTime() === today.getTime()) {
        currentStreak = 1;
    } else if (lastCompletion.getTime() === yesterday.getTime()) {
        currentStreak = 1;
    } else {
        currentStreak = 0;
    }

    for (let i = 1; i < sortedCompletions.length; i++) {
        const current = new Date(sortedCompletions[i]);
        const previous = new Date(sortedCompletions[i - 1]);
        current.setHours(0, 0, 0, 0);
        previous.setHours(0, 0, 0, 0);

        const dayDiff = Math.floor((previous - current) / (1000 * 60 * 60 * 24));

        if (dayDiff === 1) {
            if (i === 1 && currentStreak > 0) {
                currentStreak++;
            }
            tempStreak++;
        } else {
            maxStreak = Math.max(maxStreak, tempStreak);
            tempStreak = 1;
        }
    }

    maxStreak = Math.max(maxStreak, tempStreak);
    habit.streak = currentStreak;
    habit.bestStreak = Math.max(habit.bestStreak, maxStreak, currentStreak);
}

module.exports = router;