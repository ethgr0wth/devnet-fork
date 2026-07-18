const ERROR_MAP: Record<string, string> = {
  "Invalid email or password": "The email or password you entered doesn't match our records. Please try again.",
  "Not authenticated": "Your session has expired. Please log in again.",
  "Invalid or expired session": "Your session has expired. Please log in again.",
  "Email already registered": "An account with this email already exists.",
  "API key limit reached": "You've reached your API key limit. Upgrade your plan or remove unused keys.",
  "Workspace limit reached": "You've reached your workspace limit. Upgrade your plan for more.",
  "Invalid API key": "This API key is invalid or has been revoked. Please check and try again.",
  "Rate limit exceeded": "You're making requests too quickly. Please wait a moment and try again.",
  "Insufficient credits": "You don't have enough credits for this action. Add more credits to continue.",
  "Provider not configured": "This AI provider isn't set up yet. Add your API key in Provider Settings.",
  "Model not available": "This model isn't currently available. Please try a different one.",
  "License key invalid": "This license key isn't valid. Please double-check and try again.",
  "License already activated": "This license key has already been activated.",
  "No available nodes": "No AI nodes are currently available. Please try again shortly.",
  "context_too_long": "Your message is too long for this model. Try shortening it or using a model with a larger context window.",
  "Admin already exists. Use login instead.": "An admin account already exists. Please log in instead.",
};

const STATUS_MAP: Record<number, string> = {
  400: "Something went wrong with that request. Please check your input and try again.",
  401: "You need to log in to do that. Please sign in and try again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you're looking for.",
  409: "This conflicts with something that already exists.",
  422: "Some of the information provided isn't quite right. Please check and try again.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again in a moment.",
  502: "We're having trouble reaching the server. Please try again shortly.",
  503: "The service is temporarily unavailable. Please try again in a few minutes.",
};

export function friendlyError(error: unknown, fallback?: string): string {
  if (!error) return fallback || "Something went wrong. Please try again.";

  let message = "";
  let status = 0;

  if (error instanceof Response) {
    status = error.status;
  }

  if (typeof error === "string") {
    message = error;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    if (typeof obj.detail === "string") message = obj.detail;
    else if (typeof obj.message === "string") message = obj.message;
    else if (typeof obj.error === "string") message = obj.error;
    else if (typeof obj.status === "number") status = obj.status;
  }

  if (message && ERROR_MAP[message]) {
    return ERROR_MAP[message];
  }

  if (status && STATUS_MAP[status]) {
    return STATUS_MAP[status];
  }

  if (message && !message.includes("<!DOCTYPE") && !message.includes("Traceback") && message.length < 200) {
    return message;
  }

  return fallback || "Something went wrong. Please try again.";
}

export async function friendlyFetchError(res: Response, fallback?: string): Promise<string> {
  try {
    const data = await res.json();
    const detail = typeof data.detail === "string" ? data.detail : "";
    if (detail && ERROR_MAP[detail]) return ERROR_MAP[detail];
    if (detail && detail.length < 200) return detail;
  } catch {}
  
  if (STATUS_MAP[res.status]) return STATUS_MAP[res.status];
  return fallback || "Something went wrong. Please try again.";
}
