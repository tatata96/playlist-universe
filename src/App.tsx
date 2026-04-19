import { useState, useEffect } from 'react'
import { useSpotifyAuth } from './hooks/useSpotifyAuth'
import { useLikedSongsLoader } from './hooks/useLikedSongsLoader'
import { ModeSelect } from './components/mode-select/ModeSelect'
import { GalleryScene } from './components/gallery-scene/GalleryScene'
import './App.css'

const MODE_KEY = 'playlist-universe:mode'

type View = 'mode-select' | 'liked-loading' | 'gallery' | 'error'

export default function App() {
  const { tokens, isLoading: authLoading, errorMessage: authError, login } = useSpotifyAuth()
  const [view, setView] = useState<View>('mode-select')
  const [loaderEnabled, setLoaderEnabled] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [geminiToast, setGeminiToast] = useState<string | null>(null)

  const liked = useLikedSongsLoader({ enabled: loaderEnabled })

  // After OAuth callback: start loading liked songs
  useEffect(() => {
    if (authLoading) return
    if (!tokens) return
    const savedMode = sessionStorage.getItem(MODE_KEY)
    if (!savedMode) return
    sessionStorage.removeItem(MODE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaderEnabled(true)
    setView('liked-loading')
  }, [authLoading, tokens])

  // Spotify done → show gallery immediately, Gemini continues in background
  useEffect(() => {
    if (liked.stage === 'gemini' && view === 'liked-loading') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView('gallery')
    }
  }, [liked.stage, view])

  // When fully complete, disable loader and handle errors
  useEffect(() => {
    if (!liked.isComplete) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaderEnabled(false)
    if (liked.error) {
      // Spotify failure — full-page error
      setErrorMessage(liked.error)
      setView('error')
    } else if (liked.geminiError) {
      // Gemini failure — non-fatal toast
      setGeminiToast(liked.geminiError)
    }
  }, [liked.isComplete, liked.error, liked.geminiError])

  // Auto-dismiss gemini error toast
  useEffect(() => {
    if (!geminiToast) return
    const t = window.setTimeout(() => setGeminiToast(null), 5000)
    return () => window.clearTimeout(t)
  }, [geminiToast])

  const handleBegin = async () => {
    if (tokens) {
      setLoaderEnabled(true)
      setView('liked-loading')
      return
    }
    sessionStorage.setItem(MODE_KEY, 'liked-songs')
    await login()
  }

  const reset = () => {
    setLoaderEnabled(false)
    setView('mode-select')
    setErrorMessage(null)
    setGeminiToast(null)
  }

  if (view === 'gallery') {
    return (
      <>
        <GalleryScene
          tracks={liked.tracks}
          geminiReady={liked.isComplete && !liked.geminiError}
          onBack={reset}
        />
        {geminiToast && (
          <div className="app-gemini-toast">{geminiToast}</div>
        )}
      </>
    )
  }

  if (view === 'liked-loading') {
    return (
      <div className="app-status-screen">
        <div className="app-spinner" />
        <p className="app-status-text">
          {liked.loadedCount > 0
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
