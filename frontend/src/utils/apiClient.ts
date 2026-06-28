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

async function handleRequest<T>(requestFn: () => Promise<Response>): Promise<T> {
  try {
    const response = await requestFn()
    
    if (!response.ok) {
      const errorText = await response.text()
      let parsedMessage = ''
      try {
        const jsonErr = JSON.parse(errorText)
        parsedMessage = jsonErr.detail || jsonErr.message || ''
      } catch {
        parsedMessage = errorText
      }

      if (response.status === 401) {
        throw new Error(parsedMessage || 'Session has expired. Please log in again.')
      }
      if (response.status === 503) {
        throw new Error('Service Unavailable: The pocket dimension server is offline for maintenance.')
      }
      
      throw new Error(parsedMessage || `Request failed with status ${response.status}`)
    }

    if (response.status === 204) {
      return {} as T
    }

    return await response.json()
  } catch (error: any) {
    // Check if it's a network/CORS failure (fetch throws TypeError on connection loss)
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Network Connection Failure: Cannot establish link with the pocket dimension server. Please verify your internet connection or check if the backend is running.')
    }
    throw error
  }
}

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    return handleRequest<T>(async () => {
      const headers = await getHeaders()
      return fetch(`${API_BASE_URL}${path}`, {
        method: 'GET',
        headers,
      })
    })
  },

  async post<T>(path: string, body: any): Promise<T> {
    return handleRequest<T>(async () => {
      const headers = await getHeaders()
      return fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
    })
  },

  async put<T>(path: string, body: any): Promise<T> {
    return handleRequest<T>(async () => {
      const headers = await getHeaders()
      return fetch(`${API_BASE_URL}${path}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body),
      })
    })
  },

  async patch<T>(path: string, body: any): Promise<T> {
    return handleRequest<T>(async () => {
      const headers = await getHeaders()
      return fetch(`${API_BASE_URL}${path}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      })
    })
  },

  async delete<T>(path: string): Promise<T> {
    return handleRequest<T>(async () => {
      const headers = await getHeaders()
      return fetch(`${API_BASE_URL}${path}`, {
        method: 'DELETE',
        headers,
      })
    })
  },
}

