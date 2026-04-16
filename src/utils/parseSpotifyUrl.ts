const INVALID_MSG = "That doesn't look like a Spotify playlist link."

export function parseSpotifyUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(INVALID_MSG)
  }

  if (parsed.hostname !== 'open.spotify.com') throw new Error(INVALID_MSG)

  const match = parsed.pathname.match(/^\/playlist\/([A-Za-z0-9]+)$/)
  if (!match) throw new Error(INVALID_MSG)

  return match[1]
}

export function isValidSpotifyPlaylistUrl(url: string): boolean {
  try {
    parseSpotifyUrl(url)
    return true
  } catch {
    return false
  }
}
