const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const TOKEN_STORAGE_KEY = "apply_agent_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

export function storeToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function apiJson(path, options) {
  const token = getStoredToken();
  const headers = new Headers(options?.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}

export async function register({ username, password }) {
  return apiJson("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });
}

export async function login({ username, password }) {
  return apiJson("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });
}

export function fetchCurrentUser() {
  return apiJson("/api/auth/me");
}

export function logout() {
  return apiJson("/api/auth/logout", { method: "POST" });
}

export function fetchInitialData() {
  return Promise.all([apiJson("/api/cvs"), apiJson("/api/applications/runs")]);
}

export function uploadCvFile(file) {
  const formData = new FormData();
  formData.append("cv", file);

  return apiJson("/api/cvs", {
    method: "POST",
    body: formData
  });
}

export function deleteCvById(id) {
  return apiJson(`/api/cvs/${id}`, { method: "DELETE" });
}

export function deleteRunById(id) {
  return apiJson(`/api/applications/runs/${id}`, { method: "DELETE" });
}

export function updateRunStage(id, status) {
  return apiJson(`/api/applications/runs/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status })
  });
}

export function updateRunStageData(id, stageData) {
  return apiJson(`/api/applications/runs/${id}/stage-data`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(stageData)
  });
}

export function generateRunCoach(id) {
  return apiJson(`/api/applications/runs/${id}/coach`, {
    method: "POST"
  });
}

export function runMatchAgent({ cvId, jobDescription, jobUrl }) {
  return apiJson("/api/applications/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      cvId,
      jobDescription,
      jobUrl
    })
  });
}
