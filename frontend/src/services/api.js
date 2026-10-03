export async function request(path, body) {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.message || "Não foi possível executar a ação.");
  return data;
}
