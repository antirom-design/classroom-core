export function createWebSocket() {
  let ws;
  let listeners = [];
  let isConnected = false;

  function connect(url) {
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('✅ WebSocket Connected');
      isConnected = true;
      notify({ connected: true });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket Disconnected');
      isConnected = false;
      notify({ connected: false });
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket Error:', error);
    };
  }

  function handleMessage(message) {
    const { type, data } = message;
    console.log('[WS DEBUG] 📩 Received:', type, data);

    // Pass everything to subscribers
    notify({ type, data });
  }

  function send(type, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('[WS DEBUG] 📤 Sending:', type, data);
      ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('⚠️ WebSocket not ready. Cannot send:', type);
    }
  }

  function subscribe(callback) {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  }

  function notify(state) {
    listeners.forEach(callback => callback(state));
  }

  return {
    connect,
    subscribe,
    disconnect: () => ws && ws.close(),

    // Core Actions
    joinHouse: (houseCode, roomName, sessionId) => {
      send('join', { houseCode, roomName, sessionId });
    },

    // Quiz Actions (Teacher)
    startQuizMission: (sessionId, questions) => {
      send('startQuizMission', { sessionId, questions });
    },

    // Quiz Actions (Student)
    submitQuizAnswer: (sessionId, questionId, answerIndex) => {
      send('submitQuizAnswer', { sessionId, questionId, answerIndex });
    },

    // Interaction Pulse
    sendPulse: (sessionId) => {
      send('pulse', { sessionId });
    },

    // Mock functions for compatibility or future use
    sendSettings: (settings) => { },
    sendUserColorChange: (color) => { }
  };
}
