// Quiz State
let questions = [];
let currentMode = '';
let currentQueue = [];
let currentIndex = 0;
let currentQuestion = null;
let selectedAnswer = null;
let sessionStats = {
    correct: 0,
    incorrect: 0,
    startTime: null
};

// Storage keys
const STORAGE_KEY = 'quiz_progress';

// Load questions from JSON
fetch('questions.json')
    .then(r => r.json())
    .then(data => {
        questions = data;
        console.log(`✓ Завантажено ${questions.length} питань`);
    })
    .catch(err => {
        console.error('Помилка завантаження питань:', err);
        alert('Не вдалося завантажити питання. Перезавантажте сторінку.');
    });

// Get stored progress
function getProgress() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    try {
        return JSON.parse(stored);
    } catch {
        return {};
    }
}

// Save progress
function saveProgress(progress) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// Start sequential quiz with optional start number
function startSequentialQuiz() {
    const input = document.getElementById('startFromInput');
    let startFrom = parseInt(input.value);
    
    // Validate input
    if (isNaN(startFrom) || startFrom < 1) {
        startFrom = 1; // Default to question 1
    } else if (startFrom > questions.length) {
        alert(`Питання №${startFrom} не існує!\nВсього питань: ${questions.length}`);
        return;
    }
    
    startQuiz('sequential', startFrom);
}

// Start quiz with selected mode
function startQuiz(mode, startFrom = 1) {
    if (mode === 'reset') {
        if (confirm('Скинути весь прогрес?\n\nЦе видалить історію всіх правильних і неправильних відповідей.')) {
            localStorage.removeItem(STORAGE_KEY);
            alert('✓ Прогрес успішно скинуто!');
        }
        return;
    }

    currentMode = mode;
    const progress = getProgress();

    // Build queue based on mode
    if (mode === 'errors') {
        currentQueue = questions
            .map((q, i) => ({ question: q, index: i }))
            .filter(item => progress[item.index] === false); // Only incorrect answers
        
        if (currentQueue.length === 0) {
            alert('🎉 Немає помилок!\n\nВсі питання відповіли правильно або ще не розпочинали.');
            return;
        }
    } else if (mode === 'random') {
        currentQueue = questions
            .map((q, i) => ({ question: q, index: i }))
            .sort(() => Math.random() - 0.5);
    } else if (mode === 'sequential') {
        // Sequential mode: start from specified question number
        const startIndex = startFrom - 1; // Convert to 0-based index
        currentQueue = questions
            .slice(startIndex) // Start from specified index
            .map((q, i) => ({ question: q, index: startIndex + i }));
        
        if (currentQueue.length === 0) {
            alert('Немає питань для відображення!');
            return;
        }
    }

    // Reset session stats
    sessionStats = {
        correct: 0,
        incorrect: 0,
        startTime: Date.now()
    };

    currentIndex = 0;
    
    // Smooth transition
    const modeSelector = document.getElementById('modeSelector');
    const quizArea = document.getElementById('quizArea');
    
    modeSelector.style.animation = 'fadeOut 0.4s ease forwards';
    setTimeout(() => {
        modeSelector.style.display = 'none';
        quizArea.classList.add('active');
        startTimer();
        loadQuestion();
    }, 400);
}

// Timer
let timerInterval;
function startTimer() {
    const timerEl = document.getElementById('timer');
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStats.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

// Load current question
function loadQuestion() {
    if (currentIndex >= currentQueue.length) {
        finishQuiz();
        return;
    }

    const item = currentQueue[currentIndex];
    currentQuestion = item;
    selectedAnswer = null;

    // Update UI - show actual question number (not queue position)
    const actualQuestionNumber = item.index + 1; // Convert back to 1-based
    document.getElementById('questionNumber').textContent = 
        `Питання ${actualQuestionNumber} з ${questions.length}`;
    document.getElementById('questionText').textContent = item.question.question;
    
    // Progress bar
    const progress = ((currentIndex) / currentQueue.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';

    // Render options with staggered animation
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';

    item.question.options.forEach((opt, index) => {
        const div = document.createElement('div');
        div.className = 'option';
        div.textContent = `${opt.letter}) ${opt.text}`;
        div.onclick = () => selectAnswer(opt.letter, div);
        
        // Staggered fade-in animation
        div.style.opacity = '0';
        div.style.animation = `fadeInUp 0.5s ease ${index * 0.1}s forwards`;
        
        container.appendChild(div);
    });

    // Disable next button
    document.getElementById('nextBtn').disabled = true;
}

// Select answer
function selectAnswer(letter, element) {
    if (selectedAnswer !== null) return; // Already answered

    selectedAnswer = letter;
    const correct = currentQuestion.question.correct;
    const isCorrect = letter === correct;

    // Update session stats
    if (isCorrect) {
        sessionStats.correct++;
    } else {
        sessionStats.incorrect++;
    }

    // Update storage
    const progress = getProgress();
    progress[currentQuestion.index] = isCorrect;
    saveProgress(progress);

    // Show correct/incorrect with animation
    const allOptions = document.querySelectorAll('.option');
    allOptions.forEach(opt => {
        const optLetter = opt.textContent.trim()[0];
        if (optLetter === correct) {
            setTimeout(() => opt.classList.add('correct'), 100);
        } else if (optLetter === letter && !isCorrect) {
            opt.classList.add('incorrect');
        }
        opt.style.cursor = 'default';
        opt.onclick = null;
    });

    // Enable next button with slight delay
    setTimeout(() => {
        document.getElementById('nextBtn').disabled = false;
    }, 300);
}

// Next question
function nextQuestion() {
    currentIndex++;
    
    // Fade out current question
    const quizArea = document.getElementById('quizArea');
    quizArea.style.opacity = '0.5';
    
    setTimeout(() => {
        quizArea.style.opacity = '1';
        loadQuestion();
    }, 200);
}

// Finish quiz
function finishQuiz() {
    clearInterval(timerInterval);

    const elapsed = Math.floor((Date.now() - sessionStats.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const total = sessionStats.correct + sessionStats.incorrect;
    const percent = total > 0 ? Math.round((sessionStats.correct / total) * 100) : 0;

    // Smooth transition to stats
    const quizArea = document.getElementById('quizArea');
    const statsArea = document.getElementById('statsArea');
    
    quizArea.style.animation = 'fadeOut 0.4s ease forwards';
    setTimeout(() => {
        quizArea.classList.remove('active');
        statsArea.classList.add('active');
        
        // Animate stats with stagger
        document.getElementById('statCorrect').textContent = '0';
        document.getElementById('statIncorrect').textContent = '0';
        document.getElementById('statTime').textContent = '0:00';
        document.getElementById('statPercent').textContent = '0%';
        
        // Count up animation
        setTimeout(() => animateValue('statCorrect', 0, sessionStats.correct, 600), 100);
        setTimeout(() => animateValue('statIncorrect', 0, sessionStats.incorrect, 600), 200);
        setTimeout(() => {
            document.getElementById('statTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }, 300);
        setTimeout(() => animateValue('statPercent', 0, percent, 600, '%'), 400);
    }, 400);
}

// Animate number counting
function animateValue(id, start, end, duration, suffix = '') {
    const element = document.getElementById(id);
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current) + suffix;
    }, 16);
}

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);
