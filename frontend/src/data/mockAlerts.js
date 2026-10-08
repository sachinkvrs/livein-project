export const mockAlerts = [
  {
    id: 'alert-1',
    severity: 'critical',
    title: 'Severe Weather Alert',
    message: 'Heavy rainfall is affecting the Top Station area today.',
    location: 'Munnar · Top Station',
    time: 'Today, 07:40 AM',
    impact: 'High impact on Day 3 itinerary',
    action: 'Switch to the recommended indoor plan for Day 3.',
    day: 3,
  },
  {
    id: 'alert-2',
    severity: 'warning',
    title: 'Road Update',
    message: 'Road congestion detected near Thekkady due to local market traffic.',
    location: 'Thekkady',
    time: 'Today, 08:15 AM',
    impact: 'Adds ~20 minutes to Day 4 transfer',
    action: 'Depart 20 minutes earlier or take the bypass route.',
    day: 4,
  },
  {
    id: 'alert-3',
    severity: 'warning',
    title: 'Attraction Update',
    message: 'Top Station is temporarily unavailable due to trail maintenance.',
    location: 'Munnar · Top Station',
    time: 'Yesterday, 06:00 PM',
    impact: 'Affects Day 3 photo stop',
    action: 'Alternative viewpoint suggested in your updated plan.',
    day: 3,
  },
  {
    id: 'alert-4',
    severity: 'info',
    title: 'Transport Update',
    message: 'Your private cab driver has been assigned for the Kochi–Munnar transfer.',
    location: 'Kochi → Munnar',
    time: 'Yesterday, 09:00 AM',
    impact: 'No action needed',
    action: 'Driver details are available in Bookings.',
    day: 2,
  },
]

export function getAlertsBySeverity(severity) {
  return mockAlerts.filter((a) => a.severity === severity)
}
