import { useState, useCallback, useRef } from 'react'
import type { Phase } from '../../types/spotify'
import { isValidSpotifyPlaylistUrl } from '../../utils/parseSpotifyUrl'
import './playlist-input.css'

interface Props {
  phase: Phase
  error: string | null
  onSubmit: (url: string) => void
}

export function PlaylistInput({ phase, error, onSubmit }: Props) {
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLoading = phase === 'loading'

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setValue(v)
    setTouched(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setIsValid(isValidSpotifyPlaylistUrl(v))
    }, 300)
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (isValid && !isLoading) onSubmit(value)
  }, [isValid, isLoading, onSubmit, value])

  const inputClassName = [
    'playlist-input__field',
    touched && (isValid ? 'playlist-input__field--valid' : 'playlist-input__field--invalid'),
    isLoading && 'playlist-input__field--loading',
  ].filter(Boolean).join(' ')

  const buttonClassName = [
    'playlist-input__button',
    isValid && !isLoading && 'playlist-input__button--enabled',
  ].filter(Boolean).join(' ')

  return (
    <div className="playlist-input">
      {isLoading && (
        <div className="playlist-input__loading">
          <div className="playlist-input__spinner" />
        </div>
      )}

      <div className="playlist-input__title">
        <h1 className="playlist-input__heading">
          Playlist{' '}
          <em>Universe</em>
        </h1>
        <p className="playlist-input__subtitle">
          paste a spotify link to begin
        </p>
      </div>

      <form onSubmit={handleSubmit} className="playlist-input__form">
        <div className="playlist-input__row">
          <input
            type="text" value={value} onChange={handleChange}
            placeholder="open.spotify.com/playlist/..."
            disabled={isLoading} autoFocus
            className={inputClassName}
          />
          <button
            type="submit" disabled={!isValid || isLoading}
            className={buttonClassName}
          >
            Enter
          </button>
        </div>

        {error && (
          <p className="playlist-input__error">
            {error}
          </p>
        )}
      </form>
    </div>
  )
}
