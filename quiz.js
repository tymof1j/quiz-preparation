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
        console.log(`Loaded ${questions.length} questions`);
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
        alert(`Питання №${startFrom} не існує! Всього питань: ${questions.length}`);
        return;
    }
    
    startQuiz('sequential', startFrom);
}

// Start quiz with selected mode
function startQuiz(mode, startFrom = 1) {
    if (mode === 'reset') {
        if (confirm('Скинути весь прогрес? Це видалить історію правильних/неправильних відповідей.')) {
            localStorage.removeItem(STORAGE_KEY);
            alert('Прогрес скинуто!');
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
            alert('Немає помилок! Всі питання відповіли правильно або ще не відповіли.');
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
    document.getElementById('modeSelector').style.display = 'none';
    document.getElementById('quizArea').classList.add('active');
    
    startTimer();
    loadQuestion();
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
        `Питання ${actualQuestionNumber} (${currentIndex + 1} / ${currentQueue.length})`;
    document.getElementById('questionText').textContent = item.question.question;
    
    // Progress bar
    const progress = ((currentIndex) / currentQueue.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';

    // Render options
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';

    item.question.options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'option';
        div.textContent = `${opt.letter}) ${opt.text}`;
        div.onclick = () => selectAnswer(opt.letter, div);
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

    // Show correct/incorrect
    const allOptions = document.querySelectorAll('.option');
    allOptions.forEach(opt => {
        const optLetter = opt.textContent.trim()[0];
        if (optLetter === correct) {
            opt.classList.add('correct');
        } else if (optLetter === letter && !isCorrect) {
            opt.classList.add('incorrect');
        }
        opt.style.cursor = 'default';
        opt.onclick = null;
    });

    // Enable next button
    document.getElementById('nextBtn').disabled = false;
}

// Next question
function nextQuestion() {
    currentIndex++;
    loadQuestion();
}

// Finish quiz
function finishQuiz() {
    clearInterval(timerInterval);

    const elapsed = Math.floor((Date.now() - sessionStats.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const total = sessionStats.correct + sessionStats.incorrect;
    const percent = total > 0 ? Math.round((sessionStats.correct / total) * 100) : 0;

    document.getElementById('quizArea').classList.remove('active');
    document.getElementById('statsArea').classList.add('active');

    document.getElementById('statCorrect').textContent = sessionStats.correct;
    document.getElementById('statIncorrect').textContent = sessionStats.incorrect;
    document.getElementById('statTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    document.getElementById('statPercent').textContent = percent + '%';
}
