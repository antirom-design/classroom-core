<script>
  import { onMount } from "svelte";
  import { user, roomCode, appState, isHost, users } from "./lib/stores/app.js";
  import { createWebSocket } from "./lib/websocket.js";

  import NameInput from "./lib/components/NameInput.svelte";
  import RoomJoin from "./lib/components/RoomJoin.svelte";
  import TestScreen from "./lib/components/TestScreen.svelte";
  import HostView from "./lib/components/HostView.svelte";
  import StudentView from "./lib/components/StudentView.svelte";
  import UserList from "./lib/components/UserList.svelte";
  import OnlineIndicator from "./lib/components/OnlineIndicator.svelte";

  const BACKEND_URL = import.meta.env.PROD
    ? "wss://funkhaus-websocket.onrender.com"
    : "ws://localhost:3001";

  let websocket = null;
  let showUserList = false;

  onMount(() => {
    // Generate session ID
    let storedSessionId = sessionStorage.getItem("quiz_session_id");
    if (!storedSessionId) {
      storedSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("quiz_session_id", storedSessionId);
    }
    // Note: We'll pass sessionId when connecting

    // Check local storage for name
    const savedName = localStorage.getItem("quiz_last_name");

    // Check for join code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get("join");

    if (joinCode) {
      roomCode.set(joinCode);
      if (savedName) {
        user.set({ displayName: savedName });
        connect(joinCode);
      } else {
        // Wait for name input
        appState.set("NAMED");
      }
    } else if (savedName) {
      user.set({ displayName: savedName });
    }
  });

  function handleTestsPass() {
    if ($user) {
      appState.set("ROOM_SELECT");
    } else {
      appState.set("NAMED");
    }
  }

  function handleSetName(event) {
    const name = event.detail;
    user.set({ displayName: name });
    localStorage.setItem("quiz_last_name", name);
    appState.set("ROOM_SELECT");
  }

  function handleJoinRoom(event) {
    const code = event.detail;
    roomCode.set(code);
    connect(code);
  }

  function handleCreateRoom() {
    // Generate code
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    roomCode.set(code);
    connect(code);
  }

  function connect(code) {
    const sessionId = sessionStorage.getItem("quiz_session_id");
    websocket = createWebSocket();
    websocket.connect(BACKEND_URL);

    websocket.subscribe((msg) => {
      if (msg.connected) {
        websocket.joinHouse(code, $user.displayName, sessionId);
      }
      if (msg.type === "joined") {
        isHost.set(msg.data.isHousemaster);
        appState.set("IN_ROOM");
      }
      if (msg.type === "rooms") {
        users.set(msg.data);
      }
    });

    // Share websocket instance via context or props?
    // For now, pass to views
  }
</script>

<main>
  {#if $appState === "TESTING"}
    <TestScreen backendUrl={BACKEND_URL} on:testsPass={handleTestsPass} />
  {:else if $appState === "NAMED"}
    <NameInput on:submit={handleSetName} />
  {:else if $appState === "ROOM_SELECT"}
    <RoomJoin
      displayName={$user?.displayName}
      on:joinRoom={handleJoinRoom}
      on:createRoom={handleCreateRoom}
    />
  {:else if $appState === "IN_ROOM"}
    {#if $isHost}
      <HostView {websocket} roomCode={$roomCode} />
    {:else}
      <StudentView {websocket} roomCode={$roomCode} />
    {/if}

    <OnlineIndicator
      userCount={$users.length}
      on:click={() => (showUserList = !showUserList)}
    />

    <UserList
      users={$users}
      currentUserId={sessionStorage.getItem("quiz_session_id")}
      show={showUserList}
      on:close={() => (showUserList = false)}
    />
  {/if}
</main>

<style>
  main {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #1a1a1a;
    color: white;
  }
</style>
