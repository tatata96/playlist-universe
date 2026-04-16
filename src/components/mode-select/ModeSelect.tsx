import './mode-select.css'

interface Props {
  onBegin: () => void
}

export function ModeSelect({ onBegin }: Props) {
  return (
    <div className="mode-select">

      {/* Title */}
      <div className="mode-select__title">
        <h1 className="mode-select__heading">
          Playlist <em>Universe</em>
        </h1>
        <p className="mode-select__subtitle">
          invite only
        </p>
      </div>

      {/* Card */}
      <div className="mode-select__cards">
        <div className="mode-select__card mode-select__card--invite">

          <div className="mode-select__icon">❤️</div>
          <div className="mode-select__card-title">
            Liked Songs
          </div>
          <p className="mode-select__description">
            Fly through all your saved tracks in a personal universe
          </p>

          {/* Access notice */}
          <div className="mode-select__notice">
            <div className="mode-select__notice-title">
              Access required
            </div>
            <p className="mode-select__notice-text">
              Invite-only while in development.<br />
              Send your Spotify email to{' '}
              <a
                href="mailto:tamarakozok@gmail.com"
                className="mode-select__notice-link"
              >
                tamarakozok@gmail.com
              </a>{' '}
              to be added.
            </p>
          </div>

          <button onClick={onBegin} className="mode-select__button mode-select__button--primary">
            Enter →
          </button>

          {/* Disclaimer */}
          <div className="mode-select__disclaimer">
            <span>Note:</span> if your account hasn't been added,<br />
            Spotify will return an error after login.
          </div>

        </div>
      </div>
    </div>
  )
}
