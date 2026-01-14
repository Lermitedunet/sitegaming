// Test script
console.log('[TEST] Script loaded');

function getBaseTeamSafe() {
  if (typeof BASE_TEAM !== "undefined" && Array.isArray(BASE_TEAM))
    return BASE_TEAM;
  if (Array.isArray(window.TEAM)) return window.TEAM;
  if (Array.isArray(window.AUTHORS)) return window.AUTHORS;
  return [];
}

console.log('[TEST] getBaseTeamSafe defined:', typeof getBaseTeamSafe);
console.log('[TEST] BASE_TEAM exists:', typeof BASE_TEAM);