import { useState } from 'react'
import { useUniverseCore, UniverseCanvas, createItems, createImageRenderer } from 'gallery-universe'

type MovieData = {
  title: string
  genre: string
  year: number
  rating: number
  director: string
  imageUrl: string
}

const GENRES_LIST = [
  'Action', 'Drama', 'Comedy', 'Thriller', 'Horror',
  'Sci-Fi', 'Romance', 'Animation', 'Documentary', 'Fantasy',
]


const ADJECTIVES = [
  'Dark', 'Lost', 'Final', 'Last', 'Eternal', 'Silent', 'Broken',
  'Hidden', 'Golden', 'Wild', 'Sacred', 'Forgotten', 'Rising',
  'Fallen', 'Crimson', 'Iron', 'Hollow', 'Twisted', 'Ancient',
  'Burning', 'Frozen', 'Shattered', 'Cursed', 'Neon', 'Midnight',
  'Distant', 'Dead', 'Living', 'Missing', 'Painted', 'Perfect',
  'Strange', 'Empty', 'Bright', 'Deep', 'Quiet', 'Violent',
  'Beautiful', 'Savage', 'Noble', 'Reckless', 'Blind', 'Pale',
  'Bitter', 'Gentle', 'Cruel', 'Tender', 'Fleeting', 'Infinite',
]

const NOUNS = [
  'Garden', 'Storm', 'Mirror', 'Shadow', 'Kingdom', 'Dream',
  'Fire', 'Night', 'Moon', 'Star', 'Heart', 'Mind', 'World',
  'Path', 'Gate', 'City', 'River', 'Forest', 'Ocean', 'Mountain',
  'Clock', 'Machine', 'Code', 'Horizon', 'Echo', 'Phantom',
  'Throne', 'Crown', 'Mask', 'Blood', 'Bone', 'Soul', 'Ghost',
  'Flame', 'Stone', 'Wind', 'Chain', 'Road', 'Bridge', 'Tower',
  'Maze', 'Arrow', 'Key', 'Letter', 'Truth', 'War', 'Peace',
  'Hope', 'Fear', 'Signal', 'Protocol', 'Portrait', 'Requiem',
]

const DIRECTORS = [
  'Christopher Nolan', 'Denis Villeneuve', 'Wes Anderson',
  'Greta Gerwig', 'Jordan Peele', 'Bong Joon-ho',
  'Pedro Almodóvar', 'Wong Kar-wai', 'Park Chan-wook',
  'Ari Aster', 'David Fincher', 'Alfonso Cuarón',
  'Guillermo del Toro', 'Kathryn Bigelow', 'Sofia Coppola',
]

const PREFIXES = ['The ', 'A ', '', '', '', '']

function sr(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seed * arr.length)]
}

const ALL_MOVIES = createItems<MovieData>(800, (i) => {
  const g = (o: number) => sr(i * 31 + o)
  return {
    title: `${pick(PREFIXES, g(4))}${pick(ADJECTIVES, g(2))} ${pick(NOUNS, g(3))}`,
    genre: pick(GENRES_LIST, g(1)),
    year: 1968 + Math.floor(g(5) * 57),
    rating: Math.round((g(6) * 3.5 + 6.5) * 10) / 10,
    director: pick(DIRECTORS, g(7)),
    imageUrl: `https://picsum.photos/seed/cine${i}/300/450`,
  }
})

const ALL_GENRES = [...new Set(ALL_MOVIES.map((item) => item.data.genre))].sort()

const renderItem = createImageRenderer<MovieData>('imageUrl')

export default function App() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null)

  const core = useUniverseCore<MovieData>({
    items: ALL_MOVIES,
    onItemClick: (item) => {
      console.log('clicked:', item.data.title)
    },
    onItemDoubleClick: (item) => {
      console.log('double-clicked:', item.data.title)
    },
  })

  const handleFilter = (genre: string | null) => {
    setSelectedGenre(genre)
    core.setGroupBy(genre ? (item) => item.data.genre : null)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#f0f0f0' }}>
      <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 10, display: 'flex', gap: 8 }}>
        <button
          onClick={() => handleFilter(null)}
          style={{ fontWeight: selectedGenre === null ? 'bold' : 'normal' }}
        >
          Scatter
        </button>

        <button
          onClick={() => handleFilter('genre')}
          style={{ fontWeight: selectedGenre === 'genre' ? 'bold' : 'normal' }}
        >
          By Genre
        </button>
      </div>

      <UniverseCanvas
        core={{ ...core, animationState: core.animRef }}
        width={window.innerWidth}
        height={window.innerHeight}
        renderItem={renderItem}
        groupBy={selectedGenre ? (item) => item.data.genre : null}
      />

      {selectedGenre && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '8px 16px',
            background: 'rgba(240,240,240,0.92)',
            zIndex: 10,
          }}
        >
          {ALL_GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => core.navigateToGroup(genre)}
              style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {genre}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
