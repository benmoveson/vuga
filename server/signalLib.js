export const MAX_ROOM_LEN = 32;
export const MAX_NAME_LEN = 64;
export const MAX_ID_LEN = 128;
export const MAX_ROOM_PEERS = 8;
export const SIGNAL_RATE_PER_SEC = 40;
export const SIGNAL_BURST = 80;

export function cleanRoom(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, MAX_ROOM_LEN);
}

export function cleanStr(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

export function validSignalData(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.sdp && typeof data.sdp === 'object') return true;
  if (data.candidate && typeof data.candidate === 'object') return true;
  return false;
}

export function pickNextHost(remainingPeerIds, departedId, currentHostId) {
  if (currentHostId && currentHostId !== departedId) return currentHostId;
  return remainingPeerIds[0] || null;
}
