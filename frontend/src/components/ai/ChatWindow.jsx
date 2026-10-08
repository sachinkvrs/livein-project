import { useEffect, useRef, useState } from 'react'
import { Send, CheckCircle2, Sparkles } from 'lucide-react'
import ChatMessage from './ChatMessage'
import SuggestionCard from './SuggestionCard'
import PromptChips from './PromptChips'
import AIOrb from '../ui/AIOrb'
import { sendMessage } from '../../services/aiService'
import { useTrip } from '../../context/TripContext'

const dynamicPrompts = [
  'What should I do today?',
  'How much can I spend?',
  'Will rain affect my plan?',
  'Find something nearby',
  'Replan my day',
  "Optimize today's route",
]

export default function ChatWindow() {
  const {
    trip,
    activeDay,
    userLocation,
    addActivity,
    applyAiAction,
  } = useTrip()

  const destination = trip?.destination || 'Chennai'

  const [messages, setMessages] = useState([
    {
      id: 'greet-1',
      role: 'assistant',
      text: `Hello! I'm your TripNova AI Travel Companion for ${destination}. I have live access to your itinerary, budget, expenses, and weather. Ask me what to do within your budget or time window, or tell me to add, remove, or optimize activities!`,
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [lastRecommendedPlaces, setLastRecommendedPlaces] = useState([])
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const handleSend = async (text) => {
    const value = (text ?? input).trim()
    if (!value || thinking) return

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text: value }])
    setInput('')
    setThinking(true)

    try {
      const reply = await sendMessage(value, {
        tripId: trip?.id,
        activeDay: activeDay || 1,
        userLocation,
        lastRecommendedPlaces,
      })

      const places = Array.isArray(reply.recommended_places)
        ? reply.recommended_places
        : []

      if (places.length > 0) {
        setLastRecommendedPlaces(places)
      }

      if (reply.action_performed) {
        applyAiAction(reply.action_performed)
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: reply.text,
          places,
          actionPerformed: reply.action_performed || null,
        },
      ])
    } finally {
      setThinking(false)
    }
  }

  const handleAddRecommendedPlace = async (place) => {
    const targetDay = activeDay || 1
    await addActivity(targetDay, {
      title: place.title || place.name,
      category: place.category || 'Sightseeing',
      time: '04:00 PM',
      duration: place.duration || '1.5 hrs',
      area: place.area || destination,
      note: place.note || `Added via TripNova AI Assistant (₹${place.cost ?? 0})`,
      latitude: place.latitude,
      longitude: place.longitude,
      rating: place.rating || 4.5,
      cost: place.cost || 0,
    })
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `Added "${place.title || place.name}" to Day ${targetDay} of your itinerary!`,
        actionPerformed: { type: 'ADD_ACTIVITY', day: targetDay, place_name: place.title || place.name },
      },
    ])
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        {messages.map((m) => (
          <ChatMessage key={m.id} role={m.role} text={m.text}>
            {m.actionPerformed && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {m.actionPerformed.type === 'ADD_ACTIVITY' &&
                    `Added to Day ${m.actionPerformed.day || activeDay || 1}`}
                  {m.actionPerformed.type === 'REMOVE_ACTIVITY' &&
                    `Removed "${m.actionPerformed.removed_title || 'activity'}" from Day ${m.actionPerformed.day}`}
                  {m.actionPerformed.type === 'ADD_EXPENSE' &&
                    `Logged ₹${m.actionPerformed.expense?.amount} expense`}
                  {m.actionPerformed.type === 'ROUTE_OPTIMIZATION_PROPOSAL' &&
                    `Route optimization ready (${m.actionPerformed.proposal?.saved_km || 0} km saved)`}
                </span>
              </div>
            )}
            {m.places && m.places.length > 0 && (
              <SuggestionCard
                places={m.places}
                onAdd={handleAddRecommendedPlace}
              />
            )}
          </ChatMessage>
        ))}
        {thinking && (
          <div className="flex items-center gap-3 pl-2 text-xs font-semibold text-purple-400">
            <AIOrb size="sm" state="thinking" />
            <span>TripNova AI is synthesizing live route, weather & budget context…</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border bg-surface p-3.5 sm:p-4 transition-colors">
        <div className="mb-3">
          <PromptChips prompts={dynamicPrompts} onSelect={(p) => handleSend(p)} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2.5"
        >
          <div className="relative flex-1">
            <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask TripNova AI anything about your trip, budget, weather, or places nearby…"
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-secondary-500 focus:outline-none focus:ring-2 focus:ring-secondary-500/30 transition-all"
            />
          </div>
          <button
            type="submit"
            aria-label="Send message"
            disabled={!input.trim() || thinking}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-secondary-500 to-purple-600 text-white shadow-glow transition-transform hover:scale-105 active:scale-95 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
