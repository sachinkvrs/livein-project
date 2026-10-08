export const suggestedPrompts = [
  'Find nearby places',
  "Change tomorrow's plan",
  'Reduce my budget',
  'Find restaurants',
  'Add adventure activities',
  'Show less crowded places',
]

export const initialGreeting = {
  id: 'greet-1',
  role: 'assistant',
  text: 'Hello! How can I help you today?',
}

// Very small canned-response engine keyed by phrase. This is only a stand-in
// for aiService's future call to POST /api/ai/chat.
export function getMockAiReply(message) {
  const lower = message.toLowerCase()

  if (lower.includes('rain') || lower.includes('weather')) {
    return {
      text: "I'll update tomorrow's itinerary based on the weather and recommend safer alternatives.",
      recommendations: ['tea-museum', 'kerala-cooking-class', 'pothamedu'],
    }
  }
  if (lower.includes('budget')) {
    return {
      text: 'I can trim about ₹1,200 by swapping the private cab for a shared transfer on Day 4. Want me to apply it?',
      recommendations: [],
    }
  }
  if (lower.includes('restaurant') || lower.includes('food')) {
    return {
      text: 'Here are a few well-rated spots close to your Day 2 route.',
      recommendations: ['local-restaurant', 'kerala-cooking-class'],
    }
  }
  if (lower.includes('adventure')) {
    return {
      text: 'These fit your adventure interest and are clear of today\u2019s weather alert.',
      recommendations: ['periyar-wildlife', 'eravikulam'],
    }
  }
  if (lower.includes('crowd')) {
    return {
      text: 'Swapping in quieter alternatives with similar themes.',
      recommendations: ['pothamedu', 'blossom-park'],
    }
  }
  if (lower.includes('nearby') || lower.includes('near')) {
    return {
      text: 'Here\u2019s what\u2019s closest to your current stop.',
      recommendations: ['tea-museum', 'mattupetty-dam', 'echo-point'],
    }
  }
  return {
    text: "Got it — I've noted that. I can adjust today's plan, suggest nearby places, or help with your budget. What would help most?",
    recommendations: [],
  }
}
