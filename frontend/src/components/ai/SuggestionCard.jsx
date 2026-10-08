import PlaceCard from '../trip/PlaceCard'

export default function SuggestionCard({ places, onAdd }) {
  if (!places?.length) return null
  return (
    <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar pb-1">
      {places.map((place) => (
        <PlaceCard key={place.id} place={place} onAdd={onAdd} compact />
      ))}
    </div>
  )
}
