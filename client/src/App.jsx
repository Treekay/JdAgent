import React, { useEffect, useMemo, useState } from "react";
import {
  deleteCvById,
  deleteRunById,
  fetchInitialData,
  runMatchAgent,
  updateRunStage,
  uploadCvFile
} from "./api.js";
import { ApplicationForm, Intro, ResultsDashboard } from "./components.jsx";
import { resumeAccents, sampleResult } from "./data.js";
import { getRunResult, getRunStatusLabel, normalizeResult } from "./resultUtils.js";

export function App() {
  const [cvFile, setCvFile] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [result, setResult] = useState(() => normalizeResult(sampleResult));
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Demo output loaded");
  const [resumeTemplate, setResumeTemplate] = useState("compact");
  const [resumeAccent, setResumeAccent] = useState(resumeAccents[0]);

  const canRun = Boolean(selectedCvId && (jobDescription.trim() || jobUrl.trim()) && !isRunning);
  const selectedCv = useMemo(
    () => cvs.find((cv) => cv._id === selectedCvId),
    [cvs, selectedCvId]
  );
  const selectedRun = useMemo(
    () => runs.find((run) => run._id === selectedRunId),
    [runs, selectedRunId]
  );

  async function loadData() {
    setIsLoadingData(true);
    setError("");

    try {
      const [cvPayload, runPayload] = await fetchInitialData();
      const nextCvs = cvPayload.cvs || [];
      const nextRuns = runPayload.runs || [];
      setCvs(nextCvs);
      setRuns(nextRuns);
      setSelectedCvId((currentId) => currentId || nextCvs[0]?._id || "");
      setSelectedRunId((currentId) => currentId || nextRuns[0]?._id || "");
      return nextRuns;
    } catch (loadError) {
      setError(loadError.message);
      return [];
    } finally {
      setIsLoadingData(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function uploadCv() {
    if (!cvFile) return;

    setIsUploadingCv(true);
    setError("");

    try {
      const payload = await uploadCvFile(cvFile);
      setCvs((current) => [payload.cv, ...current]);
      setSelectedCvId(payload.cv._id);
      setCvFile(null);
      setStatus("CV uploaded and selected");
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploadingCv(false);
    }
  }

  async function deleteSelectedCv(id) {
    setError("");

    try {
      await deleteCvById(id);
      setCvs((current) => {
        const next = current.filter((cv) => cv._id !== id);
        if (selectedCvId === id) {
          setSelectedCvId(next[0]?._id || "");
        }
        return next;
      });
      setStatus("CV deleted");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function deleteRun(id) {
    setError("");

    try {
      await deleteRunById(id);
      setRuns((current) => current.filter((run) => run._id !== id));
      if (selectedRunId === id) {
        setSelectedRunId("");
      }
      setStatus("Match record deleted");
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function updateApplicationStatus(id, applicationStatus) {
    setError("");

    try {
      const payload = await updateRunStage(id, applicationStatus);
      setRuns((current) =>
        current.map((run) => (run._id === id ? { ...run, ...payload.run } : run))
      );
      setSelectedRunId(id);
      setStatus(`Application status updated to ${getRunStatusLabel(payload.run)}`);
    } catch (statusError) {
      setError(statusError.message);
    }
  }

  function selectRun(run) {
    setSelectedRunId(run._id);
    setResult(getRunResult(run));
  }

  async function runAgent(event) {
    event.preventDefault();
    setError("");
    setStatus("AI is reading the CV and job details");
    setIsRunning(true);

    try {
      const payload = await runMatchAgent({
        cvId: selectedCvId,
        jobDescription,
        jobUrl
      });
      setResult(normalizeResult(payload));
      setSelectedRunId(payload.id || "");
      setStatus("Latest run saved");
      await loadData();
    } catch (runError) {
      setError(runError.message);
      setStatus("");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="appShell">
      <section className="workspace">
        <Intro />
        <ApplicationForm
          canRun={canRun}
          cvFile={cvFile}
          cvs={cvs}
          error={error}
          isLoadingData={isLoadingData}
          isRunning={isRunning}
          isUploadingCv={isUploadingCv}
          jobDescription={jobDescription}
          jobUrl={jobUrl}
          runs={runs}
          selectedCv={selectedCv}
          selectedCvId={selectedCvId}
          status={status}
          onCvFileChange={setCvFile}
          onDeleteCv={deleteSelectedCv}
          onDeleteRun={deleteRun}
          onJobDescriptionChange={setJobDescription}
          onJobUrlChange={setJobUrl}
          onLoadData={loadData}
          onRunAgent={runAgent}
          onSelectCv={setSelectedCvId}
          onSelectRun={selectRun}
          onUpdateRunStatus={updateApplicationStatus}
          onUploadCv={uploadCv}
        />
      </section>

      <ResultsDashboard
        result={result}
        resumeAccent={resumeAccent}
        resumeTemplate={resumeTemplate}
        selectedRun={selectedRun}
        onAccentChange={setResumeAccent}
        onTemplateChange={setResumeTemplate}
      />
    </main>
  );
}
