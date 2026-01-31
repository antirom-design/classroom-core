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
  let autoJoinRoomCode = null;

  onMount(() => {
    // 1. Generate/Restore Session ID
    let storedSessionId = sessionStorage.getItem("quiz_session_id");
    if (!storedSessionId) {
      storedSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("quiz_session_id", storedSessionId);
    }

    // 2. Check for Join Code in URL (QR Scan)
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get("join");
    if (joinCode) {
      autoJoinRoomCode = joinCode.toUpperCase();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 3. Check for Active Room Session (Persistence)
    const savedRoomCode = sessionStorage.getItem("quiz_room_code");
    if (savedRoomCode && !autoJoinRoomCode) {
      autoJoinRoomCode = savedRoomCode;
    }

    // 4. Restore User Name
    const savedName = localStorage.getItem("quiz_last_name");
    if (savedName) {
      user.set({ displayName: savedName });
    }
  });

  function handleTestsPass() {
    if ($user) {
      // If we have a user and a room code, AUTO JOIN
      if (autoJoinRoomCode) {
        handleJoinRoom({ detail: autoJoinRoomCode });
      } else {
        appState.set("ROOM_SELECT");
      }
    } else {
      appState.set("NAMED");
    }
  }

  function handleSetName(event) {
    const name = event.detail;
    user.set({ displayName: name });
    localStorage.setItem("quiz_last_name", name);

    // Check auto join again
    if (autoJoinRoomCode) {
      handleJoinRoom({ detail: autoJoinRoomCode });
    } else {
      appState.set("ROOM_SELECT");
    }
  }

  function handleJoinRoom(event) {
    const code = event.detail;
    roomCode.set(code);
    sessionStorage.setItem("quiz_room_code", code); // Persist!
    connect(code);
  }

  function handleCreateRoom() {
    // Generate code
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    handleJoinRoom({ detail: code }); // Reuse join logic
  }

  function handleLeaveRoom() {
    sessionStorage.removeItem("quiz_room_code");
    if (websocket) {
      websocket.disconnect();
      websocket = null;
    }
    appState.set("ROOM_SELECT");
    autoJoinRoomCode = null; // Clear auto join
    window.location.reload(); // Cleanest way to reset everything
  }

  function connect(code) {
    const sessionId = sessionStorage.getItem("quiz_session_id");

    if (websocket) {
      websocket.disconnect();
    }

    websocket = createWebSocket();
    websocket.connect(BACKEND_URL);

    websocket.subscribe((msg) => {
      if (msg.connected) {
        // Only join if we are not already confirmed in
        if ($appState !== "IN_ROOM") {
          websocket.joinHouse(code, $user.displayName, sessionId);
        }
      }
      if (msg.type === "joined") {
        isHost.set(msg.data.isHousemaster);
        appState.set("IN_ROOM");
      }
      if (msg.type === "error") {
        alert(msg.data.message);
        sessionStorage.removeItem("quiz_room_code");
        appState.set("ROOM_SELECT");
      }
      if (msg.type === "rooms") {
        users.set(msg.data);
      }
    });
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
    width: 100%;
    height: 100%;
    position: relative;
  }
</style>
