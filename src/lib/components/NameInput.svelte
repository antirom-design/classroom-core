<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  let displayName = "";

  function handleSubmit(e) {
    e.preventDefault();
    if (displayName.trim()) {
      dispatch("submit", displayName.trim());
    }
  }
</script>

<div class="name-input-screen">
  <div class="glass-panel">
    <h1>CLASSROOM CORE</h1>
    <p>Prepare for the mission</p>

    <form on:submit={handleSubmit}>
      <input
        type="text"
        bind:value={displayName}
        placeholder="ENTER OPERATOR ID"
        maxlength="20"
        autocomplete="off"
        autofocus
      />

      <button type="submit" disabled={!displayName.trim()}>
        INITIALIZE MISSION
      </button>
    </form>
  </div>
</div>

<style>
  .name-input-screen {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .glass-panel {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    border-radius: 24px;
    padding: 3rem;
    max-width: 480px;
    width: 100%;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    margin: 0 0 0.5rem 0;
    letter-spacing: 4px;
    background: linear-gradient(to right, #4ecdc4, #556270);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  p {
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 2.5rem 0;
    text-transform: uppercase;
    letter-spacing: 2px;
    font-size: 0.9rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  input {
    width: 100%;
    padding: 18px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    font-size: 1.1rem;
    color: white;
    text-align: center;
    transition: all 0.2s;
    box-sizing: border-box;
    letter-spacing: 1px;
  }

  input:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.08);
    border-color: #4ecdc4;
  }

  button {
    width: 100%;
    padding: 18px;
    background: #4ecdc4;
    color: #0f172a;
    border: none;
    border-radius: 50px;
    font-size: 1.1rem;
    font-weight: 800;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 2px;
    transition: all 0.2s;
    box-shadow: 0 0 20px rgba(78, 205, 196, 0.3);
  }

  button:hover:not(:disabled) {
    transform: scale(1.02);
    box-shadow: 0 0 30px rgba(78, 205, 196, 0.5);
  }

  button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  @media (max-width: 600px) {
    .glass-panel {
      padding: 2rem;
      border-radius: 0;
      border: none;
      background: transparent;
      backdrop-filter: none;
    }
  }
</style>
