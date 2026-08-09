import { supabase } from './supabase.js'

export async function currentSession() {
  const { data } = await supabase.auth.getSession()
  return data.session ?? null
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw traducirAuth(error.message)
  return data.session
}

// El código de invitación y el nickname se validan acá para poder mostrar un
// error decente, pero quien manda es el trigger `handle_new_user`: si alguien
// llama a la API de auth directamente, el alta se aborta igual.
export async function signUp({ inviteCode, nickname, email, password }) {
  const [{ data: codeOk }, { data: nickOk }] = await Promise.all([
    supabase.rpc('invite_code_valid', { p_code: inviteCode }),
    supabase.rpc('nickname_available', { p_nickname: nickname }),
  ])
  if (!codeOk) throw fallo('Código de invitación inválido', 'inviteCode')
  // `nickname_available` devuelve false por dos motivos distintos; separarlos
  // acá evita el mensaje ambiguo de antes.
  const largo = nickname.trim().length
  if (largo < 2 || largo > 16) throw fallo('Elige un nombre de 2 a 16 caracteres.', 'nickname')
  if (!nickOk) throw fallo('Ese nombre ya está en uso', 'nickname')

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { nickname: nickname.trim(), invite_code: inviteCode.trim().toUpperCase() } },
  })
  if (error) throw traducirAuth(error.message)

  // Sin sesión = el proyecto exige confirmar el correo antes de entrar
  return { session: data.session, needsConfirmation: !data.session }
}

export async function signOut() {
  await supabase.auth.signOut()
}

// Cada error viaja con los campos que hay que marcar en rojo (`e.campos`).
export const fallo = (mensaje, ...campos) => Object.assign(new Error(mensaje), { campos })

const traducirAuth = (m) => {
  const msg = String(m)
  if (/Invalid login credentials/i.test(msg))
    return fallo('Correo o contraseña incorrectos', 'email', 'password')
  if (/Email not confirmed/i.test(msg)) return fallo('Todavía no confirmaste tu correo', 'email')
  if (/User already registered/i.test(msg)) return fallo('Ese correo ya tiene una cuenta', 'email')
  if (/Password should be at least (\d+)/i.test(msg))
    return fallo(
      `La contraseña necesita ${msg.match(/at least (\d+)/i)[1]} caracteres o más.`,
      'password',
    )
  // "Unable to validate email address: invalid format" y variantes.
  if (/valid.*email|email.*invalid|invalid format/i.test(msg))
    return fallo('Escribe un correo válido', 'email')
  if (/Database error saving new user/i.test(msg))
    return fallo(
      'No se pudo crear la cuenta: revisá el código de invitación y el nombre',
      'inviteCode',
      'nickname',
    )
  if (/rate limit|too many/i.test(msg)) return fallo('Demasiados intentos, esperá un momento')
  return fallo(msg)
}

// Devuelve null si el perfil no existe. Pasa cuando el navegador conserva una
// sesión cuyo usuario ya no está en la base: el JWT sigue siendo válido un rato
// más, así que hay que detectarlo y cerrar sesión en vez de reventar.
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname, avatar')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

export const setNickname = (nickname) => rpc('set_my_nickname', { p_nickname: nickname })
export const setAvatar = (avatar) => rpc('set_my_avatar', { p_avatar: avatar })

// Todo el estado de juego vive en Supabase (ARCHITECTURE §9): al recargar,
// la sala y la partida en curso se recuperan de la base, no de localStorage.
export async function recoverPlace(userId) {
  const { data: rp } = await supabase
    .from('room_players')
    .select('room_id, rooms(id, status)')
    .eq('user_id', userId)
  const room = (rp ?? []).map((r) => r.rooms).find((r) => r && r.status !== 'finished')
  if (!room) return { roomId: null, gameId: null }

  // Una partida cancelada tampoco es "en curso": si no, al recargar te devuelve
  // a una mesa que el host ya levantó.
  const { data: games } = await supabase
    .from('games')
    .select('id, status')
    .eq('room_id', room.id)
    .not('status', 'in', '(finished,cancelled)')
  return { roomId: room.id, gameId: games?.[0]?.id ?? null }
}

const rpc = async (name, args) => {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw new Error(error.message)
  return data
}

export const createRoom = (cfg) =>
  rpc('create_room', {
    p_max_players: cfg.maxPlayers,
    p_target_points: cfg.targetPoints,
    p_max_rounds: cfg.maxRounds,
    p_decision_timer_seconds: cfg.timer,
  })

export const joinRoom = (code) => rpc('join_room', { p_code: code })
export const leaveRoom = (roomId) => rpc('leave_room', { p_room_id: roomId })
export const startGame = (roomId) => rpc('start_game', { p_room_id: roomId })
export const setReady = (roomId, ready) => rpc('set_ready', { p_room_id: roomId, p_ready: ready })

// Marca que ya terminaste el sorteo. Cuando entra el último, el servidor
// reinicia el reloj de la ronda 1 para que todos arranquen con el tiempo entero.
export const enterGame = (gameId) => rpc('enter_game', { p_game_id: gameId })

// Deshace la confirmación de esta ronda (el espionaje ya ejecutado no se deshace)
export const cancelAction = (gameId) => rpc('cancel_action', { p_game_id: gameId })

// Solo el host: corta la partida. No puntúa ni cuenta para las estadísticas —
// una partida a medias no representa un resultado.
export const cancelGame = (gameId) => rpc('cancel_game', { p_game_id: gameId })
export const getMyMission = (gameId) => rpc('get_my_mission', { p_game_id: gameId })

// Se ejecuta al instante, antes de confirmar la decisión (GAME_DESIGN §5.2)
export const spy = (gameId, target) => rpc('spy', { p_game_id: gameId, p_target: target })

// Torre de Vigilancia: solo dice "alguien te apunta", ni quién ni con qué
export const amITargeted = (gameId) => rpc('am_i_targeted', { p_game_id: gameId })

// Comeback sin fase extra de input: se elige una vez y vale para toda la partida
export const setComebackPreference = (gameId, resource) =>
  rpc('set_comeback_preference', { p_game_id: gameId, p_resource: resource })

export const submitAction = (gameId, { buildSlot, buildSlot2, sabotage }) =>
  rpc('submit_action', {
    p_game_id: gameId,
    p_build_slot: buildSlot ?? null,
    p_build_slot_2: buildSlot2 ?? null,
    p_sabotage_type: sabotage?.type ?? null,
    p_sabotage_target: sabotage?.target ?? null,
    p_sabotage_params: sabotage?.params ?? null,
  })

export async function loadLeaderboard(limit = 3) {
  const { data, error } = await supabase.from('leaderboard').select('*').limit(limit)
  if (error) throw error
  return data
}

export async function loadMyStats(userId) {
  const [{ data: stats }, recent] = await Promise.all([
    supabase.from('leaderboard').select('*').eq('user_id', userId).maybeSingle(),
    rpc('my_recent_games', { p_limit: 10 }),
  ])
  return { stats, recent: recent ?? [] }
}

export async function loadCatalogs() {
  const [buildings, characters] = await Promise.all([
    supabase.from('buildings_catalog').select('*'),
    supabase.from('characters_catalog').select('*'),
  ])
  if (buildings.error) throw buildings.error
  if (characters.error) throw characters.error
  return {
    buildings: Object.fromEntries(buildings.data.map((b) => [b.key, b])),
    characters: Object.fromEntries(characters.data.map((c) => [c.key, c])),
  }
}
