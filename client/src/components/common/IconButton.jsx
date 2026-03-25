const icons = {
  edit: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M4 20h4l10.5-10.5-4-4L4 16v4Zm13.7-13.3 1.6-1.6a1.4 1.4 0 0 1 2 0l.6.6a1.4 1.4 0 0 1 0 2l-1.6 1.6-2.6-2.6Z"
        fill="currentColor"
      />
    </svg>
  ),
  delete: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h2v9H7V9Zm4 0h2v9h-2V9Zm4 0h2v9h-2V9ZM6 21a2 2 0 0 1-2-2V8h16v11a2 2 0 0 1-2 2H6Z"
        fill="currentColor"
      />
    </svg>
  ),
  download: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M11 4h2v8h3l-4 5-4-5h3V4Zm-7 14h16v2H4v-2Z" fill="currentColor" />
    </svg>
  )
};

export function IconButton({ icon, label, onClick, variant = 'neutral', type = 'button', disabled = false }) {
  return (
    <button
      aria-label={label}
      className={`icon-button icon-button-${variant}`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type={type}
    >
      {icons[icon]}
    </button>
  );
}
