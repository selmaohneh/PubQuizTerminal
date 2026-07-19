// Shared pieces of the room protocol between host and player pages.
//
// Rooms live entirely in Supabase Realtime channels — there is no room server.
// The quizmaster's browser is the authority: it answers join requests and
// broadcasts the public room state. Presence tracks who is currently online.
//
// Channel per room: `room-<CODE>`. Presence payloads: { role: 'host' } or
// { role: 'player', playerId, name }. Broadcast events:
//   join-request  (player → host): { playerId, name }
//   join-response (host → players): { playerId, ok, error?, name?, room?, yourAnswer? }
//   answer-submit (player → host): { playerId, answer }
//   room:update   (host → players): public room state (incl. `game`)
//   room:closed   (host → players): { reason }
(function () {
  // No easily confused characters (0/O, 1/I/L).
  const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const CODE_LENGTH = 4;
  const MAX_NAME_LENGTH = 20;

  function generateRoomCode() {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
  }

  function generateClientId() {
    return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function channelName(code) {
    return `room-${code.toUpperCase().trim()}`;
  }

  function normalizeCode(code) {
    return (code || '').toUpperCase().trim();
  }

  function isValidCode(code) {
    return new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(code);
  }

  // Tolerant answer comparison for typed answers: case-insensitive,
  // trimmed, collapsed whitespace.
  function normalizeAnswer(text) {
    return (text || '').toLowerCase().trim().replace(/\s+/g, ' ');
  }

  function answersMatch(given, expected) {
    return normalizeAnswer(given) !== '' && normalizeAnswer(given) === normalizeAnswer(expected);
  }

  function createSupabaseClient() {
    const cfg = window.PUBQUIZ_CONFIG;
    return supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
  }

  // Flattens presenceState() ({ key: [metas] }) into a single array of metas.
  function presenceMetas(channel) {
    const state = channel.presenceState();
    return Object.values(state).flat();
  }

  function findHost(channel) {
    return presenceMetas(channel).find((meta) => meta.role === 'host');
  }

  window.RoomProtocol = {
    CODE_LENGTH,
    MAX_NAME_LENGTH,
    generateRoomCode,
    generateClientId,
    channelName,
    normalizeCode,
    isValidCode,
    normalizeAnswer,
    answersMatch,
    createSupabaseClient,
    presenceMetas,
    findHost
  };
})();
