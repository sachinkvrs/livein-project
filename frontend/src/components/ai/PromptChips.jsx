export default function PromptChips({ prompts, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-secondary-400 hover:text-secondary-600"
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}
