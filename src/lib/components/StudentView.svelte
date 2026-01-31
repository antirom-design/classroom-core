<script>
  import { fade, fly } from 'svelte/transition';
  
  export let websocket;
  
  // State
  let gameState = 'WAITING'; // WAITING, QUIZ, RESULT
  let questions = [];
  let currentQuestionIndex = 0;
  let score = 0;
  let streak = 0;
  let totalScore = 0;
  
  // Current Question
  $: currentQuestion = questions[currentQuestionIndex];

  // Feedback
  let lastResult = null; // { correct: bool, points: int }

  websocket.subscribe(msg => {
    if (msg.type === 'quizMissionStarted') {
        questions = msg.data.questions;
        gameState = 'QUIZ';
        currentQuestionIndex = 0;
    }
    if (msg.type === 'quizResult') {
        const { correct, streak: newStreak, pointsAdded, totalScore: newTotal } = msg.data;
        streak = newStreak;
        totalScore = newTotal;
        gameState = 'RESULT';
        lastResult = { correct, points: pointsAdded };
        
        // Auto advance after short delay
        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                gameState = 'QUIZ';
            } else {
                gameState = 'FINISHED';
            }
        }, 1500);
    }
  });

  function submitAnswer(index) {
    if (gameState !== 'QUIZ') return;
    gameState = 'SUBMITTING';
    websocket.submitQuizAnswer(sessionStorage.getItem('quiz_session_id'), currentQuestion.id, index);
  }
</script>

<div class="student-container">
  <div class="top-bar">
    <div class="streak-badge" class:hot={streak >= 3}>
        🔥 {streak}
    </div>
    <div class="score">
        PTS: {totalScore}
    </div>
  </div>

  {#if gameState === 'WAITING'}
    <div class="waiting" in:fade>
        <h2>MISSION CONTROL</h2>
        <p>Waiting for Commander to initiate...</p>
        <div class="pulse-ring"></div>
    </div>
  
  {:else if gameState === 'QUIZ' || gameState === 'SUBMITTING'}
    <div class="quiz-card" in:fly={{ y: 200, duration: 400 }}>
        <div class="question-text">{currentQuestion.text}</div>
        
        <div class="options-grid">
            {#each currentQuestion.options as option, i}
                <button 
                  class="option-btn" 
                  on:click={() => submitAnswer(i)}
                  disabled={gameState === 'SUBMITTING'}
                >
                    {option}
                </button>
            {/each}
        </div>
        
        <div class="progress">
            Question {currentQuestionIndex + 1} / {questions.length}
        </div>
    </div>

  {:else if gameState === 'RESULT'}
    <div class="result-feedback" in:scale>
        {#if lastResult.correct}
            <h1 class="correct">✅ +{lastResult.points}</h1>
            {#if streak >= 3}
                <p class="combo">COMBO x{Math.floor(streak/3) + 1}!</p>
            {/if}
        {:else}
            <h1 class="wrong">❌</h1>
        {/if}
    </div>

  {:else if gameState === 'FINISHED'}
    <div class="finished" in:fade>
        <h1>MISSION COMPLETE</h1>
        <p>Final Score: {totalScore}</p>
        <p>Wait for next round...</p>
    </div>
  {/if}
</div>

<style>
  .student-container {
    height: 100%;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    background: #2b2b2b;
    color: white;
    font-family: 'Inter', sans-serif;
  }

  .top-bar {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2rem;
      font-size: 1.2rem;
      font-weight: bold;
  }
  
  .streak-badge {
      background: #444;
      padding: 0.5rem 1rem;
      border-radius: 20px;
  }
  
  .streak-badge.hot {
      background: linear-gradient(45deg, #FF6B6B, #FFD93D);
      color: black;
      animation: pulse 1s infinite;
  }

  .waiting, .finished {
      text-align: center;
      margin-top: 30vh;
  }
  
  .quiz-card {
      background: #333;
      border-radius: 12px;
      padding: 1.5rem;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  }
  
  .question-text {
      font-size: 1.5rem;
      margin-bottom: 2rem;
      line-height: 1.4;
  }
  
  .options-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      flex-grow: 1;
  }
  
  .option-btn {
      background: #4ECDC4;
      color: #1a1a1a;
      border: none;
      padding: 1rem;
      font-size: 1.2rem;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.1s;
  }
  
  .option-btn:active {
      transform: scale(0.98);
  }

  .result-feedback {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
  }
  
  .correct { color: #4ECDC4; font-size: 4rem; margin: 0; }
  .wrong { color: #FF6B6B; font-size: 4rem; margin: 0; }
  
  @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
  }
</style>
