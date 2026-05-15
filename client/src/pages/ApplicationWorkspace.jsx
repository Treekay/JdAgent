import React, { useEffect, useState } from "react";
import {
  deleteCvById,
  deleteRunById,
  fetchInitialData,
  runMatchAgent,
  uploadCvFile
} from "../api.js";
import { CvLibraryView } from "../components/application/CvLibraryView.jsx";
import { DashboardHome } from "../components/application/DashboardHome.jsx";
import { NewApplicationView } from "../components/application/NewApplicationView.jsx";
import { getRunStatus } from "../resultUtils.js";
import { applicationStatuses } from "../data.js";

function statusCount(runs, status) {
  if (status === "all") {
    return runs.length;
  }

  return runs.filter((run) => getRunStatus(run) === status).length;
}

const dashboardStatusFilters = [{ id: "all", label: "Total" }, ...applicationStatuses];

export function ApplicationWorkspace({ onOpenRun }) {
  const [dashboardView, setDashboardView] = useState("home");
  const [activeStatus, setActiveStatus] = useState("all");
  const [cvFile, setCvFile] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Demo output loaded");

  const canRun = Boolean(selectedCvId && (jobDescription.trim() || jobUrl.trim()) && !isRunning);
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

  function selectRun(run) {
    setSelectedRunId(run._id);
    onOpenRun?.(run._id);
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
      setSelectedRunId(payload.id || "");
      setStatus("Latest run saved.");
      onOpenRun?.(payload.id);
      await loadData();
    } catch (runError) {
      setError(runError.message);
      setStatus("");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="pageShell">
      <section className="pageHeader compactHeader">
        <div>
          <span>Dashboard</span>
          <h1>Prepare and track every target application.</h1>
        </div>
        <p>
          Upload CVs, start a new match, and move roles through preparation, application,
          interview, and result stages.
        </p>
      </section>

      {dashboardView === "home" ? (
        <section className="dashboardStats">
          {dashboardStatusFilters.map((applicationStatus) => (
            <button
              className={activeStatus === applicationStatus.id ? "active" : ""}
              key={applicationStatus.id}
              type="button"
              onClick={() => {
                setActiveStatus(applicationStatus.id);
                setDashboardView("home");
              }}
            >
              <strong>{statusCount(runs, applicationStatus.id)}</strong>
              <span>{applicationStatus.label}</span>
            </button>
          ))}
        </section>
      ) : null}

      <section className="dashboardGrid">
        {dashboardView === "home" ? (
          <DashboardHome
            activeStatus={activeStatus}
            cvs={cvs}
            runs={runs}
            onDeleteRun={deleteRun}
            onOpenCvs={() => setDashboardView("cvs")}
            onOpenNewApplication={() => setDashboardView("new")}
            onSelectRun={selectRun}
          />
        ) : null}

        {dashboardView === "cvs" ? (
          <CvLibraryView
            cvFile={cvFile}
            cvs={cvs}
            isLoadingData={isLoadingData}
            isUploadingCv={isUploadingCv}
            selectedCvId={selectedCvId}
            onBack={() => setDashboardView("home")}
            onCvFileChange={setCvFile}
            onDeleteCv={deleteSelectedCv}
            onLoadData={loadData}
            onSelectCv={setSelectedCvId}
            onUploadCv={uploadCv}
          />
        ) : null}

        {dashboardView === "new" ? (
          <NewApplicationView
            canRun={canRun}
            cvFile={cvFile}
            cvs={cvs}
            error={error}
            isLoadingData={isLoadingData}
            isRunning={isRunning}
            isUploadingCv={isUploadingCv}
            jobDescription={jobDescription}
            jobUrl={jobUrl}
            selectedCvId={selectedCvId}
            status={status}
            onBack={() => setDashboardView("home")}
            onCvFileChange={setCvFile}
            onDeleteCv={deleteSelectedCv}
            onJobDescriptionChange={setJobDescription}
            onJobUrlChange={setJobUrl}
            onLoadData={loadData}
            onRunAgent={runAgent}
            onSelectCv={setSelectedCvId}
            onUploadCv={uploadCv}
          />
        ) : null}
      </section>
    </main>
  );
}
