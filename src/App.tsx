import { useState, useEffect } from 'react'
import { useSpotifyAuth } from './hooks/useSpotifyAuth'
import { useLikedSongsLoader } from './hooks/useLikedSongsLoader'
import { ModeSelect } from './components/mode-select/ModeSelect'
import { GalleryScene } from './components/gallery-scene/GalleryScene'
import type { Track } from './types/spotify'
import './App.css'

const MODE_KEY = 'playlist-universe:mode'

type View = 'mode-select' | 'liked-loading' | 'gallery' | 'error'

export default function App() {
  const { tokens, isLoading: authLoading, errorMessage: authError, login } = useSpotifyAuth()
  const [view, setView] = useState<View>('mode-select')
  const [galleryTracks, setGalleryTracks] = useState<Track[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const liked = useLikedSongsLoader({ enabled: view === 'liked-loading' })

  // After OAuth callback: start loading liked songs
  useEffect(() => {
    if (authLoading) return
    if (!tokens) return
    const savedMode = sessionStorage.getItem(MODE_KEY)
    if (!savedMode) return
    sessionStorage.removeItem(MODE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView('liked-loading')
  }, [authLoading, tokens])

  // When liked songs load completes, go to gallery or error
  useEffect(() => {
    if (!liked.isComplete) return
    if (liked.error) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setErrorMessage(liked.error)
      setView('error')
    } else {
      setGalleryTracks(liked.tracks)
      setView('gallery')
    }
  }, [liked.isComplete, liked.error, liked.tracks])

  const handleBegin = async () => {
    if (tokens) {
      setView('liked-loading')
      return
    }
    sessionStorage.setItem(MODE_KEY, 'liked-songs')
    await login()
  }

  const reset = () => {
    setView('mode-select')
    setGalleryTracks([])
    setErrorMessage(null)
  }

  if (view === 'gallery') {
    return <GalleryScene tracks={galleryTracks} onBack={reset} />
  }

  if (view === 'liked-loading') {
    return (
      <div className="app-status-screen">
        <div className="app-spinner" />
        <p className="app-status-text">
          {liked.stage === 'groq'
            ? `Enriching ${liked.enrichedCount} / ${liked.totalCount} tracks...`
            : liked.loadedCount > 0
              ? `Loading ${liked.loadedCount} tracks...`
              : 'Loading liked songs...'}
        </p>
      </div>
    )
  }

  if (view === 'error') {
    return (
      <div className="app-status-screen app-status-screen--padded">
        <p className="app-error-text">{errorMessage}</p>
        <button onClick={reset} className="app-back-button">← Back</button>
      </div>
    )
  }

  return (
    <>
      <ModeSelect onBegin={handleBegin} />
      {authError && <div className="app-auth-error">{authError}</div>}
    </>
  )
}
