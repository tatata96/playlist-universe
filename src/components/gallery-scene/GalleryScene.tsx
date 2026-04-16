import { useState, useMemo, useCallback } from 'react'
import { useUniverseCore, UniverseCanvas, createItems, createImageRenderer } from 'gallery-universe'
import type { RenderItem, UniverseItem } from 'gallery-universe'
import type { Track } from '../../types/spotify'
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

  const items = useMemo(
    () => createItems<Track>(tracks.length, (i) => tracks[i]),
    [tracks]
  )

  const core = useUniverseCore<Track>({
    items,
    onItemClick: (item: UniverseItem<Track>) => {
      const idx = tracks.findIndex((t) => t.id === item.data.id)
      if (idx !== -1) setSelectedIndex(idx)
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
    <div className="gallery-scene">
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

      <UniverseCanvas
        core={{ ...core, animationState: core.animRef }}
        width={window.innerWidth}
        height={window.innerHeight}
        renderItem={renderItem}
        groupBy={groupByFn}
      />

      {selectedTrack && (
        <SpotifyPlayer
          track={selectedTrack}
          onNext={handleNext}
        />
      )}
    </div>
  )
}
