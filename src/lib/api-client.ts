// Helper para fetch con manejo de errores

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number = 500) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  })

  if (!res.ok) {
    let message = `Error ${res.status}`
    try {
      const data = await res.json()
      message = data.error || data.message || message
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
