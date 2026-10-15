export default function Help({
  open,
  onClose,
  staticMode,
  setStaticMode,
  canGoLive,
}: {
  open: boolean
  onClose: () => void
  staticMode: boolean
  setStaticMode: (v: boolean) => void
  canGoLive: boolean
}) {
  if (!open) return null
  return (
    <div className="help" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={onClose}>
      <div className="help__card" onClick={(e) => e.stopPropagation()}>
        <h2 id="help-title">Cockpit</h2>
        <dl>
          <dt>
            <kbd>↑</kbd> <kbd>↓</kbd> or <kbd>j</kbd> <kbd>k</kbd>
          </dt>
          <dd>Move between legs of the log</dd>
          <dt>Drag</dt>
          <dd>Spin the globe. It drifts back to the current leg on its own.</dd>
          <dt>
            <kbd>?</kbd>
          </dt>
          <dd>This panel</dd>
        </dl>
        <label className="help__toggle">
          <input type="checkbox" checked={staticMode} onChange={(e) => setStaticMode(e.target.checked)} disabled={!canGoLive && !staticMode} />
          <span>Static version (no 3D, kinder to batteries and older machines)</span>
        </label>
        {!canGoLive && <p className="help__note">Your browser or motion settings picked the static version automatically.</p>}
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}
