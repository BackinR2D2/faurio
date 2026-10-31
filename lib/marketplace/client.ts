export async function studioRequest<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers }, cache: "no-store" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Cererea nu a putut fi procesată.");
  return body as T;
}
