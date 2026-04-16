import { useMemo } from 'react'
import { useUniverseCore, UniverseCanvas, createItems, createImageRenderer } from 'gallery-universe'
import type { Track } from '../types/spotify'

interface Props {
  tracks: Track[]
  onBack: () => void
}

// Module-level — does not depend on data
const renderItem = createImageRenderer<Track>('image')

export function GalleryScene({ tracks, onBack }: Props) {
  const items = useMemo(
    () => createItems<Track>(tracks.length, (i) => tracks[i]),
    [tracks]
  )

  const core = useUniverseCore<Track>({
    items,
    onItemClick: (item) => {
      console.log(`${item.data.title} — ${item.data.artist}`)
    },
  })

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--void)' }}>
      <button
        onClick={onBack}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 10,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem', letterSpacing: '0.15em', padding: '6px 14px',
          textTransform: 'uppercase', cursor: 'pointer',
          transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--gold)'
          e.currentTarget.style.color = 'var(--gold)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
      >
        ← Back
      </button>

      <UniverseCanvas
        core={{ ...core, animationState: core.animRef }}
        width={window.innerWidth}
        height={window.innerHeight}
        renderItem={renderItem}
        groupBy={null}
      />
    </div>
  )
}
