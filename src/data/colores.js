// Un color por asiento, asignado por orden de llegada. Es lo que permite
// distinguir a dos jugadores que eligieron el mismo avatar, así que el índice
// tiene que ser el mismo en la sala, el sorteo y la partida.
export const TINTES = [
  '#e8a33d',
  '#7fb069',
  '#6ea8d8',
  '#c98bd0',
  '#e07a5f',
  '#d8c85a',
  '#8ed17a',
  '#b98ae0',
]

export const tinte = (i) => TINTES[i % TINTES.length]
