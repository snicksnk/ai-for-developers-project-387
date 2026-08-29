import type { paths } from "@/api/types";

// `VITE_API_BASE_URL` unset -> talk to the local dev backend.
// Set to "" (the production Docker build) -> same-origin relative requests,
// since one container serves both the frontend and the API.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4010";

export const API_BASE = API_BASE_URL;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new ApiError(
      response.status,
      text || `${response.status} ${response.statusText}`
    );
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export async function apiGet<T>(
  path: keyof paths | (string & Record<never, never>)
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  return handleResponse<T>(response);
}

export async function apiPost<T>(
  path: keyof paths | (string & Record<never, never>),
  body: unknown
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

export async function apiPut<T>(
  path: keyof paths | (string & Record<never, never>),
  body: unknown
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

export async function apiDelete<T>(
  path: keyof paths | (string & Record<never, never>)
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
  });
  return handleResponse<T>(response);
}
