import { writable } from 'svelte/store';

export const user = writable(null);
export const roomCode = writable(null);
export const appState = writable('TESTING'); // TESTING, NAMED, ROOM_SELECT, IN_ROOM
export const isHost = writable(false);
export const serverState = writable({}); // Last received server state
