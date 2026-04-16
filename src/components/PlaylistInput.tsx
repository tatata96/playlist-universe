import { useState, useCallback, useRef } from 'react'
import type { Phase } from '../types/spotify'
import { isValidSpotifyPlaylistUrl } from '../utils/parseSpotifyUrl'

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

  const inputBorderColor = !touched
    ? 'var(--border)'
    : isValid
    ? 'var(--gold)'
    : 'rgba(200, 80, 80, 0.5)'

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '28px',
      background: 'var(--void)', position: 'relative',
    }}>
      {isLoading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(6, 6, 13, 0.75)', zIndex: 10,
        }}>
          <div style={{
            width: 36, height: 36,
            border: '2px solid var(--gold-dim)', borderTopColor: 'var(--gold)',
            borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}

      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 300,
          fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '0.08em',
          color: 'var(--text-primary)', lineHeight: 1,
        }}>
          Playlist{' '}
          <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Universe</em>
        </h1>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: 'var(--text-secondary)', marginTop: '10px',
        }}>
          paste a spotify link to begin
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{
        display: 'flex', flexDirection: 'column', gap: '10px',
        width: '100%', maxWidth: '480px', padding: '0 24px',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text" value={value} onChange={handleChange}
            placeholder="open.spotify.com/playlist/..."
            disabled={isLoading} autoFocus
            style={{
              flex: 1, background: 'transparent',
              border: `1px solid ${inputBorderColor}`,
              color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem', padding: '10px 14px', outline: 'none',
              letterSpacing: '0.04em', transition: 'border-color 0.2s',
              opacity: isLoading ? 0.5 : 1,
            }}
          />
          <button
            type="submit" disabled={!isValid || isLoading}
            style={{
              background: isValid && !isLoading ? 'var(--gold)' : 'transparent',
              border: `1px solid ${isValid && !isLoading ? 'var(--gold)' : 'var(--border)'}`,
              color: isValid && !isLoading ? 'var(--void)' : 'var(--text-dim)',
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
              letterSpacing: '0.15em', padding: '10px 20px',
              textTransform: 'uppercase',
              cursor: isValid && !isLoading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >
            Enter
          </button>
        </div>

        {error && (
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
            color: 'rgba(200, 80, 80, 0.9)', letterSpacing: '0.04em',
          }}>
            {error}
          </p>
        )}
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
