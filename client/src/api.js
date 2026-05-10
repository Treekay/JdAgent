const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function apiJson(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
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
