interface CalloutProps {
  title: string
  body: string
}

export function Callout({ title, body }: CalloutProps) {
  return (
    <div className="callout">
      <div className="callout-title">{title}</div>
      <div className="callout-text">{body}</div>
    </div>
  )
}
