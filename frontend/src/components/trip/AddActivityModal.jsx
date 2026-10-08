import { useState } from 'react'
import { MapPin, Clock, Tag, FileText, IndianRupee } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'

const categoryOptions = [
  { value: 'Sightseeing', label: '🏛️ Sightseeing & Heritage' },
  { value: 'Beach', label: '🏖️ Beach & Nature' },
  { value: 'Food', label: '🍽️ Food & Dining' },
  { value: 'Adventure', label: '🧗 Adventure & Sports' },
  { value: 'Shopping', label: '🛍️ Shopping & Markets' },
  { value: 'Relaxation', label: '🧘 Relaxation & Leisure' },
  { value: 'Culture', label: '🎭 Culture & Arts' },
]

export default function AddActivityModal({
  isOpen,
  onClose,
  dayNumber,
  onAddActivity,
  destination = 'Chennai',
}) {
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('10:00 AM')
  const [duration, setDuration] = useState('1.5h')
  const [category, setCategory] = useState('Sightseeing')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    setSubmitting(true)
    try {
      await onAddActivity({
        title: title.trim(),
        time,
        duration,
        category,
        note: note.trim() || `Visit ${title.trim()}`,
        area: destination,
        indoor: category === 'Food' || category === 'Shopping' || category === 'Culture',
        outdoor: category === 'Beach' || category === 'Adventure',
        weatherSensitive: category === 'Beach' || category === 'Adventure',
      })
      setTitle('')
      setNote('')
      onClose()
    } catch (err) {
      console.error('Failed to add activity:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Add Activity — Day ${dayNumber}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Activity / Place Name"
          name="title"
          placeholder="e.g. Kapaleeshwarar Temple"
          icon={MapPin}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Scheduled Time"
            name="time"
            placeholder="e.g. 10:00 AM"
            icon={Clock}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />

          <Input
            label="Duration"
            name="duration"
            placeholder="e.g. 2h"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>

        <Select
          label="Category"
          name="category"
          options={categoryOptions}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <Input
          label="Note / Description"
          name="note"
          placeholder="e.g. Famous historic temple known for Dravidian architecture"
          icon={FileText}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} disabled={!title.trim()}>
            Add to Itinerary
          </Button>
        </div>
      </form>
    </Modal>
  )
}
