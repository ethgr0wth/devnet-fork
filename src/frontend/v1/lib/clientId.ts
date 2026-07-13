const CLIENT_ID_KEY = 'aiassist_client_id';

export function getClientId(): string {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

export function clearClientId(): void {
  localStorage.removeItem(CLIENT_ID_KEY);
}
