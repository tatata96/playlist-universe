import { useState, useMemo, useCallback, useEffect } from 'react'
import type { CSSProperties } from 'react'
import {
  useUniverseCore,
  UniverseCanvas,
  CategoryNav,
  createItems,
  createImageRenderer,
} from 'gallery-universe'
import type { RenderItem, UniverseItem } from 'gallery-universe'
import type { Track } from '../../types/spotify'
import type { SpotifyPlaylist } from '../../spotify/api/spotifyApiModels'
import { addTrackToPlaylist, createPlaylist } from '../../spotify/api/spotifyApi'
import { SpotifyPlayer } from '../spotify-player/SpotifyPlayer'
import './gallery-scene.css'

interface Props {
  tracks: Track[]
  geminiReady: boolean
  onBack: () => void
}

type GroupByMode =
  | 'scatter'
  | 'year'
  | 'added'
  | 'country'
  | 'speed'
  | 'genre'
  | 'energy'
  | 'scene'
  | 'instrumentation'
  | 'popularityTier'

const GEMINI_MODES = new Set<GroupByMode>(['country', 'speed', 'genre', 'energy', 'scene', 'instrumentation', 'popularityTier'])

const GROUP_BY_MODES: GroupByMode[] = [
  'scatter',
  'year',
  'added',
  'country',
  'speed',
  'genre',
  'energy',
  'scene',
  'instrumentation',
  'popularityTier',
]

const GROUP_BY_LABELS: Record<GroupByMode, string> = {
  scatter: 'Scatter',
  year: 'By Year',
  added: 'By Added',
  country: 'By Country',
  speed: 'By Speed',
  genre: 'By Genre',
  energy: 'By Energy',
  scene: 'By Scene',
  instrumentation: 'By Sound',
  popularityTier: 'By Popularity',
}

const categoryNavPlayerOffset = {
  bottom: 116,
} satisfies CSSProperties

function getEnergyBucket(energy?: number) {
  if (energy == null) return 'unknown'
  if (energy < 35) return 'low'
  if (energy < 70) return 'medium'
  return 'high'
}

function getTrackGroup(track: Track, mode: GroupByMode) {
  if (mode === 'year') return track.releaseDate.slice(0, 4)
  if (mode === 'added') return track.addedAt.slice(0, 7)
  if (mode === 'country') return track.country ?? 'unknown'
  if (mode === 'speed') return track.speed ?? 'unknown'
  if (mode === 'genre') return track.genre?.[0] ?? 'unknown'
  if (mode === 'energy') return getEnergyBucket(track.energy)
  if (mode === 'scene') return track.scene?.[0] ?? 'unknown'
  if (mode === 'instrumentation') return track.instrumentation?.[0] ?? 'unknown'
  if (mode === 'popularityTier') return track.popularityTier ?? 'unknown'
  return 'scatter'
}

// Module-level — does not depend on data
const renderItem = createImageRenderer<Track>('image')

export function GalleryScene({ tracks, geminiReady, onBack }: Props) {
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight })
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
    function handleResize() {
      setDimensions({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
    } else {
      core.setGroupBy((item: UniverseItem<Track>) => getTrackGroup(item.data, mode))
    }
  }

  const groupByFn = useMemo((): ((item: RenderItem<Track>) => string) | null => {
    if (groupByMode !== 'scatter') return (item) => getTrackGroup(item.data, groupByMode)
    return null
  }, [groupByMode])

  const groups = useMemo(() => {
    if (groupByMode === 'scatter') return []

    const counts = new Map<string, number>()
    for (const track of tracks) {
      const key = getTrackGroup(track, groupByMode)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    return [...counts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => {
        if (a.key === 'unknown') return 1
        if (b.key === 'unknown') return -1
        return a.key.localeCompare(b.key, undefined, { numeric: true })
      })
  }, [groupByMode, tracks])

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
        {GROUP_BY_MODES.map((mode) => {
          const isActive = groupByMode === mode
          const isDisabled = GEMINI_MODES.has(mode) && !geminiReady
          return (
            <button
              key={mode}
              onClick={() => handleSetGroupBy(mode)}
              disabled={isDisabled}
              className={`gallery-scene__button${isActive ? ' gallery-scene__button--active' : ''}${isDisabled ? ' gallery-scene__button--pending' : ''}`}
            >
              {GROUP_BY_LABELS[mode]}
            </button>
          )
        })}
      </div>

      <CategoryNav
        groups={groups}
        cameraRef={core.cameraRef}
        groupCentersRef={core.groupCentersRef}
        onSelect={(key) => core.navigateToGroup(key)}
        outerStyle={selectedTrack ? categoryNavPlayerOffset : undefined}
      />

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
        core={core}
        width={dimensions.width}
        height={dimensions.height}
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
