import type { Mode } from '../types/spotify'

interface Props {
  onModeSelect: (mode: Mode) => void
}

export function ModeSelect({ onModeSelect }: Props) {
  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '36px', background: '#ffffff', padding: '24px',
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    }}>

      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: "'Fraunces', serif", fontWeight: 700,
          fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '0.02em',
          color: '#1a1917', lineHeight: 1,
        }}>
          Playlist <em style={{ fontStyle: 'italic' }}>Universe</em>
        </h1>
        <p style={{
          fontSize: '0.6rem', letterSpacing: '0.2em',
          textTransform: 'uppercase', color: '#a8a5a0', marginTop: '10px',
        }}>
          choose a mode to begin
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '580px', alignItems: 'stretch' }}>

        {/* Playlist URL */}
        <div style={{
          flex: 1, border: '1px solid #e0ddd8', padding: '28px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '14px', background: '#f7f7f5', textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.5rem' }}>🔗</div>
          <div style={{
            fontSize: '0.65rem', letterSpacing: '0.22em',
            textTransform: 'uppercase', color: '#4a7c59',
          }}>
            Playlist URL
          </div>
          <p style={{
            fontSize: '0.6rem', color: '#6b6860', lineHeight: 1.7,
            letterSpacing: '0.04em', flex: 1,
          }}>
            Paste any Spotify playlist link and explore it as a 3D universe
          </p>
          <button
            onClick={() => onModeSelect('playlist-url')}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem',
              letterSpacing: '0.15em', textTransform: 'uppercase',
              border: '1px solid #4a7c59', padding: '9px 20px',
              color: '#4a7c59', cursor: 'pointer', width: '100%', background: 'transparent',
            }}
          >
            Enter →
          </button>
        </div>

        {/* Liked Songs */}
        <div style={{
          flex: 1, border: '1px solid #e0ddd8', padding: '28px 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '14px', background: '#f7f7f5', textAlign: 'center', position: 'relative',
        }}>
          {/* Badge */}
          <div style={{
            position: 'absolute', top: 12, right: 12,
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.45rem',
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: '#a8a5a0', border: '1px solid #e0ddd8',
            padding: '3px 8px', background: '#ffffff',
          }}>
            invite only
          </div>

          <div style={{ fontSize: '1.5rem' }}>❤️</div>
          <div style={{
            fontSize: '0.65rem', letterSpacing: '0.22em',
            textTransform: 'uppercase', color: '#4a7c59',
          }}>
            Liked Songs
          </div>
          <p style={{
            fontSize: '0.6rem', color: '#6b6860', lineHeight: 1.7,
            letterSpacing: '0.04em', flex: 1,
          }}>
            Fly through all your saved tracks in a personal universe
          </p>

          {/* Access notice */}
          <div style={{
            padding: '12px 14px',
            border: '1px solid rgba(180,50,50,0.25)',
            borderLeft: '2px solid #a03030',
            background: 'rgba(180,50,50,0.08)',
            textAlign: 'left', width: '100%',
          }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.48rem',
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: '#a03030', marginBottom: '6px', opacity: 0.85,
            }}>
              Access required
            </div>
            <p style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.56rem',
              color: '#6b6860', lineHeight: 1.65,
            }}>
              Invite-only while in development.<br />
              Send your Spotify email to{' '}
              <a
                href="mailto:tamarakozok@gmail.com"
                style={{ color: '#a03030', textDecoration: 'none' }}
              >
                tamarakozok@gmail.com
              </a>{' '}
              to be added.
            </p>
          </div>

          <button
            onClick={() => onModeSelect('liked-songs')}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              border: '1px solid #e0ddd8', padding: '9px 20px',
              color: '#6b6860', cursor: 'pointer', width: '100%', background: 'transparent',
            }}
          >
            I have an invite →
          </button>

          {/* Disclaimer */}
          <div style={{
            width: '100%', textAlign: 'center',
            fontFamily: "'JetBrains Mono', monospace", fontSize: '0.5rem',
            letterSpacing: '0.06em', color: '#a8a5a0', lineHeight: 1.65,
            paddingTop: '10px', borderTop: '1px solid #e0ddd8',
          }}>
            <span style={{ color: 'rgba(160,48,48,0.7)' }}>Note:</span> if your account hasn't been added,<br />
            Spotify will return an error after login.
          </div>
        </div>

      </div>
    </div>
  )
}
