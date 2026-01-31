<script>
    import { fade, fly, scale } from "svelte/transition";
    import TopBar from "./TopBar.svelte";

    export let websocket;
    export let roomCode;

    // State
    let gameState = "WAITING"; // WAITING, QUIZ, RESULT
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let streak = 0;
    let totalScore = 0;

    // Current Question
    $: currentQuestion = questions[currentQuestionIndex];

    // Feedback

    websocket.subscribe((msg) => {
        if (msg.type === "quizMissionStarted") {
            console.log("[StudentView] 🚀 Mission Started!", msg.data);
            questions = msg.data.questions;
            gameState = "QUIZ";
            currentQuestionIndex = 0;
        }
        if (msg.type === "quizResult") {
            const { streak: newStreak, totalScore: newTotal } = msg.data;
            streak = newStreak;
            totalScore = newTotal;

            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                gameState = "QUIZ";
            } else {
                gameState = "FINISHED";
            }
        }
    });

    function submitAnswer(index) {
        if (gameState !== "QUIZ") return;
        gameState = "SUBMITTING";
        websocket.submitQuizAnswer(
            sessionStorage.getItem("quiz_session_id"),
            currentQuestion.id,
            index,
        );
    }

    function handleLeave() {
        window.location.reload();
    }

    function handlePulse() {
        const btn = document.querySelector(".pulse-btn");
        btn.classList.add("pushed");
        setTimeout(() => btn.classList.remove("pushed"), 200);

        websocket.sendPulse(sessionStorage.getItem("quiz_session_id"));
    }
</script>

<div class="student-container">
    <TopBar {roomCode} isHousemaster={false} on:leave={handleLeave} />

    <div class="hud">
        <div class="stat glass" class:hot={streak >= 3}>
            <span class="label">STREAK</span>
            <span class="value">{streak < 3 ? streak : `🔥 ${streak}`}</span>
        </div>
        <div class="stat glass">
            <span class="label">CREDITS</span>
            <span class="value">{totalScore}</span>
        </div>
    </div>

    {#if gameState === "WAITING"}
        <div class="overlay waiting" in:fade>
            <div class="glass-card">
                <div class="pulse-icon">📡</div>
                <h2>SYNCING WITH COMMAND</h2>
                <p>Awaiting deployment orders from Commander...</p>
            </div>
        </div>
    {:else if gameState === "QUIZ" || gameState === "SUBMITTING"}
        <div class="quiz-area" in:fly={{ y: 50, duration: 400 }}>
            <div class="question-panel glass">
                <div class="progress-bar">
                    <div
                        class="progress-fill"
                        style="width: {(currentQuestionIndex /
                            questions.length) *
                            100}%"
                    ></div>
                </div>
                <h3>{currentQuestion.text}</h3>
            </div>

            <div class="options-grid">
                {#each currentQuestion.options as option, i}
                    <button
                        class="option-btn glass"
                        on:click={() => submitAnswer(i)}
                        disabled={gameState === "SUBMITTING"}
                    >
                        {option}
                    </button>
                {/each}
            </div>

            <div class="status-footer">
                DECIPHERING SIGNAL {currentQuestionIndex + 1} / {questions.length}
            </div>
        </div>
    {:else if gameState === "FINISHED"}
        <div class="overlay finished" in:scale>
            <div class="glass-card">
                <div class="medal-icon">🏆</div>
                <h1>MISSION COMPLETE</h1>
                <div class="final-report">
                    <span class="label">FINAL CREDITS EARNED</span>
                    <span class="value">{totalScore}</span>
                </div>
                <p>Wait for commander to re-initialize mission...</p>
            </div>
        </div>
    {/if}

    <button class="pulse-btn" on:click={handlePulse}> 📡 SIGNAL </button>
</div>

<style>
    .student-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        color: white;
        font-family: "Inter", sans-serif;
        box-sizing: border-box;
        overflow: hidden;
        padding: 24px;
        justify-content: center;
    }

    .hud {
        position: fixed;
        top: 12px;
        left: 12px;
        display: flex;
        gap: 8px;
        pointer-events: none;
        z-index: 100;
    }

    .stat.glass {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 6px 16px;
        border-radius: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .stat.hot {
        border-color: #ff6b6b;
        box-shadow: 0 0 15px rgba(255, 107, 107, 0.3);
    }

    .stat .label {
        font-size: 0.6rem;
        color: rgba(255, 255, 255, 0.4);
        letter-spacing: 2px;
        font-weight: 800;
        line-height: 1;
        margin-bottom: 2px;
    }

    .stat .value {
        font-size: 1.1rem;
        font-weight: 900;
        color: #4ecdc4;
        line-height: 1;
    }

    .stat.hot .value {
        color: #ff6b6b;
    }

    .overlay {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
    }

    .glass-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        padding: 3rem;
        border-radius: 32px;
        max-width: 480px;
        width: 100%;
        text-align: center;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
    }

    .pulse-icon,
    .medal-icon {
        font-size: 3.5rem;
        margin-bottom: 1rem;
    }

    h1 {
        font-size: 2.2rem;
        font-weight: 800;
        margin: 0 0 1.5rem 0;
        letter-spacing: -1px;
        background: linear-gradient(to right, #4ecdc4, #556270);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    h2 {
        font-size: 1.4rem;
        font-weight: 800;
        letter-spacing: 2px;
        margin: 1rem 0;
    }

    p {
        color: rgba(255, 255, 255, 0.5);
        font-size: 0.95rem;
        line-height: 1.6;
    }

    .final-report {
        margin: 2rem 0;
        padding: 1.5rem;
        background: rgba(78, 205, 196, 0.1);
        border-radius: 20px;
        border: 1px solid rgba(78, 205, 196, 0.2);
    }

    .final-report .label {
        display: block;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.4);
        letter-spacing: 2px;
        margin-bottom: 0.5rem;
        font-weight: 700;
    }

    .final-report .value {
        font-size: 3.5rem;
        font-weight: 900;
        color: #4ecdc4;
        line-height: 1;
    }

    .quiz-area {
        max-width: 800px;
        width: 100%;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .question-panel.glass {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(15px);
        padding: 2.5rem;
        border-radius: 28px;
        position: relative;
        overflow: hidden;
    }

    .progress-bar {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.05);
    }

    .progress-fill {
        height: 100%;
        background: #4ecdc4;
        box-shadow: 0 0 10px #4ecdc4;
        transition: width 0.3s ease;
    }

    h3 {
        font-size: 1.8rem;
        line-height: 1.4;
        margin: 0;
        font-weight: 700;
        text-align: center;
    }

    .options-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
    }

    .option-btn.glass {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        padding: 1.8rem 1.2rem;
        border-radius: 20px;
        color: white;
        font-size: 1.1rem;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .option-btn:hover:not(:disabled) {
        background: rgba(78, 205, 196, 0.1);
        border-color: #4ecdc4;
        transform: translateY(-4px);
    }

    .option-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .status-footer {
        text-align: center;
        font-size: 0.7rem;
        letter-spacing: 3px;
        color: rgba(255, 255, 255, 0.3);
        font-weight: 700;
    }

    .pulse-btn {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.5);
        padding: 10px 24px;
        border-radius: 40px;
        font-size: 0.8rem;
        font-weight: 800;
        cursor: pointer;
        backdrop-filter: blur(10px);
        transition: all 0.2s;
        text-transform: uppercase;
        letter-spacing: 2px;
        z-index: 100;
    }

    .pulse-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        border-color: rgba(255, 255, 255, 0.3);
    }

    .pulse-btn.pushed {
        transform: translateX(-50%) scale(0.95);
        background: #4ecdc4;
        color: #0f172a;
        box-shadow: 0 0 20px rgba(78, 205, 196, 0.5);
    }

    @media (max-width: 600px) {
        .student-container {
            padding: 16px;
            padding-top: 80px;
            justify-content: flex-start;
        }

        .options-grid {
            grid-template-columns: 1fr;
            gap: 12px;
        }

        h3 {
            font-size: 1.4rem;
        }

        .question-panel.glass {
            padding: 1.5rem;
        }

        .glass-card {
            padding: 2rem;
        }

        .hud {
            width: calc(100% - 24px);
            justify-content: center;
        }
    }
</style>
