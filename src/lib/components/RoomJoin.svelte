<script>
  import { createEventDispatcher } from "svelte";

  export let displayName;

  const dispatch = createEventDispatcher();

  let roomCode = "";
  let isEditingName = false;
  let newName = displayName;

  function handleCreate() {
    dispatch("createRoom");
  }

  function handleJoin(e) {
    e.preventDefault();
    if (roomCode.length === 6) {
      dispatch("joinRoom", roomCode.toUpperCase());
    }
  }

  function startEditName() {
    isEditingName = true;
    newName = displayName;
  }

  function cancelEditName() {
    isEditingName = false;
    newName = displayName;
  }

  function saveNewName(e) {
    e.preventDefault();
    if (newName.trim()) {
      dispatch("changeName", newName.trim());
      isEditingName = false;
    }
  }
</script>

<div class="join-screen">
  <div class="glass-container">
    {#if isEditingName}
      <form on:submit={saveNewName} class="name-edit-form">
        <h2>UPDATE OPERATOR ID</h2>
        <input
          type="text"
          bind:value={newName}
          placeholder="New Name"
          maxlength="20"
          autocomplete="off"
          autofocus
        />
        <div class="button-group">
          <button type="submit" class="primary" disabled={!newName.trim()}>
            SAVE
          </button>
          <button type="button" class="secondary" on:click={cancelEditName}>
            CANCEL
          </button>
        </div>
      </form>
    {:else}
      <div class="header-section">
        <button
          class="edit-name-btn"
          on:click={startEditName}
          aria-label="Edit name"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
            />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <h1>{displayName}</h1>
        <p>MISSION STATUS: READY</p>
      </div>

      <div class="action-grid">
        <div class="card">
          <h3>START NEW MISSION</h3>
          <p>Initialize a secure room for your team</p>
          <button class="primary" on:click={handleCreate}> CREATE ROOM </button>
        </div>

        <div class="divider">
          <span class="or-text">OR</span>
        </div>

        <div class="card">
          <h3>JOIN SUB-STATION</h3>
          <p>Enter the 6-digit deployment code</p>
          <form on:submit={handleJoin}>
            <div class="join-group">
              <input
                type="text"
                bind:value={roomCode}
                placeholder="XJ9L2W"
                maxlength="6"
                autocomplete="off"
                class="code-input"
              />
              <button
                type="submit"
                disabled={roomCode.length !== 6}
                class="join-btn"
              >
                ENGAGE
              </button>
            </div>
          </form>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .join-screen {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
  }

  .glass-container {
    max-width: 900px;
    width: 100%;
    text-align: center;
  }

  .header-section {
    margin-bottom: 3rem;
    position: relative;
  }

  .edit-name-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 10px;
    border-radius: 50%;
    cursor: pointer;
    color: #4ecdc4;
    transition: all 0.2s;
    margin-bottom: 1rem;
    display: inline-flex;
  }

  .edit-name-btn:hover {
    background: rgba(78, 205, 196, 0.2);
    transform: scale(1.1);
  }

  h1 {
    font-size: 3.5rem;
    margin: 0;
    font-weight: 800;
    letter-spacing: -1px;
    color: white;
  }

  p {
    color: rgba(255, 255, 255, 0.4);
    letter-spacing: 2px;
    font-size: 0.9rem;
    margin-top: 0.5rem;
  }

  .action-grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 2rem;
    align-items: stretch;
  }

  .card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(15px);
    padding: 2.5rem;
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.3s ease;
  }

  .card:hover {
    border-color: rgba(78, 205, 196, 0.3);
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-5px);
  }

  h3 {
    margin: 0 0 1rem 0;
    font-size: 1.2rem;
    letter-spacing: 2px;
    color: #4ecdc4;
  }

  .divider {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .or-text {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.3);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 0.8rem;
    font-weight: 800;
  }

  .join-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .code-input {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 14px;
    border-radius: 12px;
    color: white;
    text-align: center;
    font-size: 1.5rem;
    letter-spacing: 4px;
    text-transform: uppercase;
    font-weight: 700;
    width: 100%;
    box-sizing: border-box;
  }

  .code-input:focus {
    outline: none;
    border-color: #4ecdc4;
    background: rgba(255, 255, 255, 0.08);
  }

  button {
    padding: 16px 24px;
    border-radius: 50px;
    font-weight: 800;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  button.primary {
    background: #4ecdc4;
    color: #0f172a;
    box-shadow: 0 0 15px rgba(78, 205, 196, 0.3);
  }

  button.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  button:hover:not(:disabled) {
    transform: scale(1.05);
  }

  button.primary:hover:not(:disabled) {
    box-shadow: 0 0 25px rgba(78, 205, 196, 0.5);
  }

  button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .name-edit-form {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(20px);
    padding: 3rem;
    border-radius: 24px;
    max-width: 450px;
    margin: 0 auto;
  }

  .name-edit-form h2 {
    font-size: 1.5rem;
    letter-spacing: 3px;
    margin-bottom: 2rem;
    color: white;
  }

  .button-group {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 1rem;
  }

  /* Mobile responsiveness */
  @media (max-width: 800px) {
    .action-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .divider {
      padding: 0.5rem 0;
    }

    .join-screen {
      justify-content: flex-start;
      padding-top: 4rem;
      overflow-y: auto;
    }

    h1 {
      font-size: 2.5rem;
    }
  }
</style>
