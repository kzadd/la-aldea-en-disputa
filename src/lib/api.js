import { supabase } from './supabase.js'

// Sesión anónima: el juego no pide registro, la sala es la identidad.
export async function ensureSession() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session
  const { data: signed, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return signed.session
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function setNickname(userId, nickname) {
  const { error } = await supabase.from('profiles').update({ nickname }).eq('id', userId)
  if (error) throw error
}

// Todo el estado de juego vive en Supabase (ARCHITECTURE §9): al recargar,
// la sala y la partida en curso se recuperan de la base, no de localStorage.
export async function recoverPlace(userId) {
  const { data: rp } = await supabase
    .from('room_players')
    .select('room_id, rooms(id, status)')
    .eq('user_id', userId)
  const room = (rp ?? []).map((r) => r.rooms).find((r) => r && r.status !== 'finished')
  if (!room) return { roomId: null, gameId: null }

  const { data: games } = await supabase
    .from('games')
    .select('id, status')
    .eq('room_id', room.id)
    .neq('status', 'finished')
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
