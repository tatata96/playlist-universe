import type { Track } from '../../types/spotify'
import type { SpotifyTrack, SpotifyTrackItem } from '../api/spotifyApiModels'

export function mapToTrack(item: SpotifyTrackItem & { track: SpotifyTrack }): Track {
  const track = item.track

  return {
    id: track.id,
    title: track.name,
    artist: track.artists[0].name,
    album: track.album.name,
    image: track.album.images[0]?.url ?? '',
    releaseDate: track.album.release_date,
    addedAt: item.added_at,
  }
}
