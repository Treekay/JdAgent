import { useEffect, useMemo, useState } from "react";
import { fetchInitialData } from "../api.js";

export function useRuns(initialRunId = "") {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadRuns() {
    setIsLoading(true);
    setError("");

    try {
      const [, runPayload] = await fetchInitialData();
      const nextRuns = runPayload.runs || [];
      setRuns(nextRuns);
      setSelectedRunId((currentId) => currentId || initialRunId || nextRuns[0]?._id || "");
      return nextRuns;
    } catch (loadError) {
      setError(loadError.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRuns();
  }, [initialRunId]);

  const selectedRun = useMemo(
    () => runs.find((run) => run._id === selectedRunId) || null,
    [runs, selectedRunId]
  );

  return {
    error,
    isLoading,
    loadRuns,
    runs,
    selectedRun,
    selectedRunId,
    setRuns,
    setSelectedRunId
  };
}
