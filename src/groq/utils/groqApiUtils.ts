import type { Track } from '../../types/spotify'
import type { GroqTrackInput } from '../api/groqApiModels'

export function mapTrackToGroqInput(track: Track): GroqTrackInput {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    releaseDate: track.releaseDate,
  }
}

export function buildGroqTrackEnrichmentPrompt(tracks: GroqTrackInput[]) {
  return `
Analyze these Spotify tracks and return exactly one JSON object with this shape:
{
  "tracks": [
    {
      "id": "same input id",
      "country": "string",
      "speed": "slow|medium|fast",
      "genre": ["1 to 3 short labels"],
      "energy": 0,
      "scene": ["1 to 3 short labels"],
      "instrumentation": ["1 to 3 short labels"],
      "popularityTier": "mainstream|cult|obscure|classic|viral|unknown"
    }
  ]
}

For each track:
- country: likely country most associated with the artist or song.
- speed: "slow", "medium", or "fast".
- genre: 1 to 3 short genre labels.
- energy: number from 0 to 100.
- scene: 1 to 3 listening contexts, for example "night drive", "party", "study", "gym", "rainy day".
- instrumentation: 1 to 3 dominant sounds, for example "guitar", "synth", "piano", "strings", "drums", "bass".
- popularityTier: "mainstream", "cult", "obscure", "classic", "viral", or "unknown".

Rules:
- Return every input id exactly once.
- Do not invent extra ids.
- Use only the allowed enum values for speed and popularityTier.
- Keep array labels concise and lowercase.
- If the context is not enough, use the best likely value.
- Return JSON only. No markdown.

Tracks:
${JSON.stringify(tracks)}
`.trim()
}
