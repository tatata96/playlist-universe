import { useState, useMemo, useCallback, useEffect } from 'react'
import { useUniverseCore, UniverseCanvas, createItems, createImageRenderer } from 'gallery-universe'
import type { RenderItem, UniverseItem } from 'gallery-universe'
import type { Track } from '../../types/spotify'
import type { SpotifyPlaylist } from '../../spotify/api/spotifyApiModels'
import { addTrackToPlaylist, createPlaylist } from '../../spotify/api/spotifyApi'
import { SpotifyPlayer } from '../spotify-player/SpotifyPlayer'
import './gallery-scene.css'

interface Props {
  tracks: Track[]
  onBack: () => void
}

type GroupByMode = 'scatter' | 'year' | 'added'

// Module-level — does not depend on data
const renderItem = createImageRenderer<Track>('image')

export function GalleryScene({ tracks, onBack }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [groupByMode, setGroupByMode] = useState<GroupByMode>('scatter')
  const [playlist, setPlaylist] = useState<SpotifyPlaylist | null>(null)
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [addingTrackIds, setAddingTrackIds] = useState<Set<string>>(() => new Set())
  const [addedTrackIds, setAddedTrackIds] = useState<Set<string>>(() => new Set())
  const [playlistName, setPlaylistName] = useState('')
  const [playlistError, setPlaylistError] = useState<string | null>(null)
  const [playlistTag, setPlaylistTag] = useState<string | null>(null)

  useEffect(() => {
    if (!playlistTag) return

    const timeout = window.setTimeout(() => setPlaylistTag(null), 1400)
    return () => window.clearTimeout(timeout)
  }, [playlistTag])

  const items = useMemo(
    () => createItems<Track>(tracks.length, (i) => tracks[i]),
    [tracks]
  )

  const handleCreatePlaylist = useCallback(async () => {
    if (playlist || isCreatingPlaylist) return

    const trimmedName = playlistName.trim()
    if (!trimmedName) {
      setPlaylistError('Enter a playlist name.')
      return
    }

    setIsCreatingPlaylist(true)
    setPlaylistError(null)
    setPlaylistTag('creating')

    try {
      const created = await createPlaylist(
        trimmedName,
        'Created in Playlist Universe.',
      )
      setPlaylist(created)
      setPlaylistTag('ready')
    } catch (err: unknown) {
      setPlaylistError(err instanceof Error ? err.message : 'Could not create playlist.')
      setPlaylistTag(null)
    } finally {
      setIsCreatingPlaylist(false)
    }
  }, [isCreatingPlaylist, playlist, playlistName])

  const handleAddTrackToPlaylist = useCallback(async (track: Track) => {
    if (!playlist) return

    if (addedTrackIds.has(track.id)) {
      setPlaylistTag('already added')
      return
    }

    if (addingTrackIds.has(track.id)) return

    setAddingTrackIds((prev) => new Set(prev).add(track.id))
    setPlaylistTag('adding')

    try {
      await addTrackToPlaylist(playlist.id, `spotify:track:${track.id}`)
      setAddedTrackIds((prev) => new Set(prev).add(track.id))
      setPlaylistTag('added')
    } catch (err: unknown) {
      setPlaylistError(err instanceof Error ? err.message : `Could not add ${track.title}.`)
      setPlaylistTag(null)
    } finally {
      setAddingTrackIds((prev) => {
        const next = new Set(prev)
        next.delete(track.id)
        return next
      })
    }
  }, [addedTrackIds, addingTrackIds, playlist])

  const core = useUniverseCore<Track>({
    items,
    onItemClick: (item: UniverseItem<Track>) => {
      const idx = tracks.findIndex((t) => t.id === item.data.id)
      if (idx !== -1) setSelectedIndex(idx)
    },
    onItemDoubleClick: (item: UniverseItem<Track>) => {
      void handleAddTrackToPlaylist(item.data)
    },
  })

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev === null ? null : (prev + 1) % tracks.length))
  }, [tracks.length])

  const handleSetGroupBy = (mode: GroupByMode) => {
    setGroupByMode(mode)
    if (mode === 'scatter') {
      core.setGroupBy(null)
    } else if (mode === 'year') {
      core.setGroupBy((item: UniverseItem<Track>) => item.data.releaseDate.slice(0, 4))
    } else {
      core.setGroupBy((item: UniverseItem<Track>) => item.data.addedAt.slice(0, 7))
    }
  }

  const groupByFn = useMemo((): ((item: RenderItem<Track>) => string) | null => {
    if (groupByMode === 'year') return (item) => item.data.releaseDate.slice(0, 4)
    if (groupByMode === 'added') return (item) => item.data.addedAt.slice(0, 7)
    return null
  }, [groupByMode])

  const selectedTrack = selectedIndex !== null ? tracks[selectedIndex] : null

  return (
    <div className={`gallery-scene${playlist ? ' gallery-scene--playlist-mode' : ''}`}>
      {/* Back button */}
      <button
        onClick={onBack}
        className="gallery-scene__button gallery-scene__back-button"
      >
        ← Back
      </button>

      {/* Group-by buttons — vertical column below back button */}
      <div className="gallery-scene__group-buttons">
        {(['scatter', 'year', 'added'] as GroupByMode[]).map((mode) => {
          const label = mode === 'scatter' ? 'Scatter' : mode === 'year' ? 'By Year' : 'By Added'
          const isActive = groupByMode === mode
          return (
            <button
              key={mode}
              onClick={() => handleSetGroupBy(mode)}
              className={`gallery-scene__button${isActive ? ' gallery-scene__button--active' : ''}`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="gallery-scene__playlist-controls">
        {!playlist && (
          <div className="gallery-scene__playlist-form">
            <input
              className="gallery-scene__playlist-input"
              value={playlistName}
              onChange={(event) => {
                setPlaylistName(event.target.value)
                setPlaylistError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleCreatePlaylist()
              }}
              placeholder="Playlist name"
              disabled={isCreatingPlaylist}
            />
            <button
              onClick={handleCreatePlaylist}
              className="gallery-scene__button"
              disabled={isCreatingPlaylist}
            >
              {isCreatingPlaylist ? 'Creating...' : 'Create Playlist'}
            </button>
          </div>
        )}
        {playlist && (
          <p className="gallery-scene__playlist-summary">
            {playlist.name} · {addedTrackIds.size} added
          </p>
        )}
        {playlistTag && (
          <span className="gallery-scene__playlist-tag">
            {playlistTag}
          </span>
        )}
        {playlistError && (
          <p className="gallery-scene__playlist-error">
            {playlistError}
          </p>
        )}
      </div>

      <UniverseCanvas
        core={{ ...core, animationState: core.animRef }}
        width={window.innerWidth}
        height={window.innerHeight}
        renderItem={renderItem}
        groupBy={groupByFn}
      />

      {selectedTrack && (
        <SpotifyPlayer
          key={selectedTrack.id}
          track={selectedTrack}
          onNext={handleNext}
        />
      )}
    </div>
  )
}
