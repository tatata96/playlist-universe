import { useState, useMemo, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { useUniverseCore, UniverseCanvas, createItems, createImageRenderer } from 'gallery-universe'
import type { RenderItem, UniverseItem } from 'gallery-universe'
import type { Track } from '../types/spotify'
import { SpotifyPlayer } from './SpotifyPlayer'

interface Props {
  tracks: Track[]
  onBack: () => void
}

type GroupByMode = 'scatter' | 'year' | 'added'

// Module-level — does not depend on data
const renderItem = createImageRenderer<Track>('image')

const BTN_BASE: CSSProperties = {
  background: 'transparent',
  border: '1px solid #ccc',
  color: '#555',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.65rem',
  letterSpacing: '0.15em',
  padding: '6px 14px',
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'border-color 0.2s, color 0.2s',
  textAlign: 'left',
}

const BTN_ACTIVE: CSSProperties = {
  ...BTN_BASE,
  borderColor: '#c9a84c',
  color: '#c9a84c',
}

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
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'white' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 10,
          ...BTN_BASE,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#c9a84c'
          e.currentTarget.style.color = '#c9a84c'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#ccc'
          e.currentTarget.style.color = '#555'
        }}
      >
        ← Back
      </button>

      {/* Group-by buttons — vertical column below back button */}
      <div style={{
        position: 'fixed', top: 60, left: 16, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {(['scatter', 'year', 'added'] as GroupByMode[]).map((mode) => {
          const label = mode === 'scatter' ? 'Scatter' : mode === 'year' ? 'By Year' : 'By Added'
          const isActive = groupByMode === mode
          return (
            <button
              key={mode}
              onClick={() => handleSetGroupBy(mode)}
              style={isActive ? BTN_ACTIVE : BTN_BASE}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = '#c9a84c'
                  e.currentTarget.style.color = '#c9a84c'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = '#ccc'
                  e.currentTarget.style.color = '#555'
                }
              }}
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
