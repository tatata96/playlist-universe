import { useState, useEffect } from 'react'
import { useSpotifyAuth } from './hooks/useSpotifyAuth'
import { usePlaylistLoader } from './hooks/usePlaylistLoader'
import { useLikedSongsLoader } from './hooks/useLikedSongsLoader'
import { beginSpotifyLogin } from './lib/spotifyAuth'
import { ModeSelect } from './components/ModeSelect'
import { PlaylistInput } from './components/PlaylistInput'
import { GalleryScene } from './components/GalleryScene'
import type { Track, Mode } from './types/spotify'

const MODE_KEY = 'playlist-universe:mode'

type View = 'mode-select' | 'url-input' | 'liked-loading' | 'gallery' | 'error'

export default function App() {
  const { tokens, isLoading: authLoading, errorMessage: authError } = useSpotifyAuth()
  const [view, setView] = useState<View>('mode-select')
  const [galleryTracks, setGalleryTracks] = useState<Track[]>([])
  const [likedError, setLikedError] = useState<string | null>(null)

  const playlist = usePlaylistLoader()
  const liked = useLikedSongsLoader({ enabled: view === 'liked-loading' })

  // After OAuth callback: read stored mode and route to correct view
  useEffect(() => {
    if (authLoading) return
    if (!tokens) return
    const savedMode = sessionStorage.getItem(MODE_KEY) as Mode | null
    if (!savedMode) return
    sessionStorage.removeItem(MODE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(savedMode === 'playlist-url' ? 'url-input' : 'liked-loading')
  }, [authLoading, tokens])

  // Playlist URL mode: when load completes, go to gallery
  useEffect(() => {
    if (playlist.phase === 'ready') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGalleryTracks(playlist.tracks)
      setView('gallery')
    }
  }, [playlist.phase, playlist.tracks])

  // Liked songs mode: when fetch completes, go to gallery or error
  useEffect(() => {
    if (!liked.isComplete) return
    if (liked.error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLikedError(liked.error)
      setView('error')
    } else {
      setGalleryTracks(liked.tracks)
      setView('gallery')
    }
  }, [liked.isComplete, liked.error, liked.tracks])

  const handleModeSelect = async (mode: Mode) => {
    sessionStorage.setItem(MODE_KEY, mode)
    await beginSpotifyLogin()
  }

  const reset = () => {
    setView('mode-select')
    setGalleryTracks([])
    setLikedError(null)
    playlist.reset()
  }

  if (view === 'gallery') {
    return <GalleryScene tracks={galleryTracks} onBack={reset} />
  }

  if (view === 'url-input') {
    return <PlaylistInput phase={playlist.phase} error={playlist.error} onSubmit={playlist.load} />
  }

  if (view === 'liked-loading') {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        background: '#ffffff', fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{
          width: 32, height: 32, border: '2px solid #e0ddd8',
          borderTopColor: '#4a7c59', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{
          fontSize: '0.6rem', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: '#6b6860',
        }}>
          {liked.loadedCount > 0 ? `Loading ${liked.loadedCount} tracks…` : 'Loading liked songs…'}
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (view === 'error') {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '20px',
        background: '#ffffff', fontFamily: "'JetBrains Mono', monospace", padding: '24px',
      }}>
        <p style={{
          fontSize: '0.65rem', color: '#a03030', letterSpacing: '0.04em',
          textAlign: 'center', maxWidth: '400px', lineHeight: 1.7,
        }}>
          {likedError}
        </p>
        <button
          onClick={reset}
          style={{
            background: 'transparent', border: '1px solid #e0ddd8',
            color: '#6b6860', fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.6rem', letterSpacing: '0.15em',
            padding: '8px 20px', textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      </div>
    )
  }

  return (
    <>
      <ModeSelect onModeSelect={handleModeSelect} />
      {authError && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem',
          color: '#a03030', letterSpacing: '0.04em', textAlign: 'center',
          background: '#fff', border: '1px solid rgba(180,50,50,0.25)',
          padding: '10px 20px', maxWidth: '420px',
        }}>
          {authError}
        </div>
      )}
    </>
  )
}
