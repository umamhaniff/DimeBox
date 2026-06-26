import { supabase } from './supabaseClient'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

async function getHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Get current active session to retrieve the latest JWT
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  return headers
}

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const headers = await getHeaders()
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API GET Error (${response.status}): ${errorText || response.statusText}`)
    }
    
    return response.json()
  },

  async post<T>(path: string, body: any): Promise<T> {
    const headers = await getHeaders()
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API POST Error (${response.status}): ${errorText || response.statusText}`)
    }

    return response.json()
  },

  async put<T>(path: string, body: any): Promise<T> {
    const headers = await getHeaders()
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API PUT Error (${response.status}): ${errorText || response.statusText}`)
    }

    return response.json()
  },

  async patch<T>(path: string, body: any): Promise<T> {
    const headers = await getHeaders()
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API PATCH Error (${response.status}): ${errorText || response.statusText}`)
    }

    return response.json()
  },

  async delete<T>(path: string): Promise<T> {
    const headers = await getHeaders()
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API DELETE Error (${response.status}): ${errorText || response.statusText}`)
    }

    return response.json()
  },
}
