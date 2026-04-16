const POINTS_KEY = 'scout_points_total'

export function getPoints() {
  return parseInt(localStorage.getItem(POINTS_KEY) || '0', 10)
}

export function addPoints(amount) {
  const next = getPoints() + amount
  localStorage.setItem(POINTS_KEY, String(next))
  return next
}
