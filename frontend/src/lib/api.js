const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function predict(payload) {
  const res = await fetch(`${API_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  return res.json()
}

export async function checkHealth() {
  const res = await fetch(`${API_URL}/health`)
  if (!res.ok) throw new Error('API unreachable')
  return res.json()
}
