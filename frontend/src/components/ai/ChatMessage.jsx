import { Sparkles, User } from 'lucide-react'

export default function ChatMessage({ role, text, children }) {
  const isAssistant = role === 'assistant'
  return (
    <div className={`flex items-start gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      <div
        className={[
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          isAssistant ? 'bg-primary text-white' : 'bg-secondary-50 text-secondary-600',
        ].join(' ')}
      >
        {isAssistant ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className={`max-w-[85%] sm:max-w-[75%] ${isAssistant ? '' : 'flex flex-col items-end'}`}>
        <div
          className={[
            'rounded-2xl px-4 py-2.5 text-sm',
            isAssistant ? 'rounded-tl-sm bg-card border border-border text-ink' : 'rounded-tr-sm bg-primary text-white',
          ].join(' ')}
        >
          {text}
        </div>
        {children}
      </div>
    </div>
  )
}
