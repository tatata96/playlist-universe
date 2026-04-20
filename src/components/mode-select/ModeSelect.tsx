import './mode-select.css'

interface Props {
  onBegin: () => void
}

export function ModeSelect({ onBegin }: Props) {
  return (
    <div className="mode-select">
      <div className="mode-select__sky" aria-hidden="true">
        <span className="mode-select__spark mode-select__spark--one" />
        <span className="mode-select__spark mode-select__spark--two" />
        <span className="mode-select__spark mode-select__spark--three" />
        <span className="mode-select__spark mode-select__spark--four" />
      </div>

      <div className="mode-select__title">
        <div className="mode-select__build">Private beta build</div>
        <h1 className="mode-select__heading">
          Playlist <em>Universe</em>
        </h1>
        <p className="mode-select__subtitle">
          press start to launch
        </p>
      </div>

      <div className="mode-select__cards">
        <div className="mode-select__card mode-select__card--invite">
          <div className="mode-select__badge">Save file 01</div>

          <div className="mode-select__card-title">
            Fly Through Your Liked Songs
          </div>
          <p className="mode-select__description">
            Launch your saved tracks into orbit
          </p>

          <div className="mode-select__notice">
            <div className="mode-select__notice-title">
              Access pass required
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
            Press Start
          </button>

          <div className="mode-select__disclaimer">
            <span>Note:</span> if your account hasn't been added,<br />
            Spotify will return an error after login.
          </div>

        </div>
      </div>
    </div>
  )
}
