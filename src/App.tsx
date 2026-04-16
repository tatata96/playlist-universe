import { useState, useEffect } from 'react'
import { useSpotifyAuth } from './hooks/useSpotifyAuth'
import { usePlaylistLoader } from './hooks/usePlaylistLoader'
import { useLikedSongsLoader } from './hooks/useLikedSongsLoader'
import { beginSpotifyLogin } from './lib/spotifyAuth'
import { ModeSelect } from './components/mode-select/ModeSelect'
import { PlaylistInput } from './components/playlist-input/PlaylistInput'
import { GalleryScene } from './components/gallery-scene/GalleryScene'
import type { Track, Mode } from './types/spotify'
import './App.css'

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
      <div className="app-status-screen">
        <div className="app-spinner" />
        <p className="app-status-text">
          {liked.loadedCount > 0 ? `Loading ${liked.loadedCount} tracks…` : 'Loading liked songs…'}
        </p>
      </div>
    )
  }

  if (view === 'error') {
    return (
      <div className="app-status-screen app-status-screen--padded">
        <p className="app-error-text">
          {likedError}
        </p>
        <button
          onClick={reset}
          className="app-back-button"
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
        <div className="app-auth-error">
          {authError}
        </div>
      )}
    </>
  )
}
