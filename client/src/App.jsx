import React, { useEffect, useState } from "react";
import {
  clearStoredToken,
  fetchCurrentUser,
  getStoredToken,
  logout
} from "./api.js";
import { SidebarNavigation } from "./components/application/SidebarNavigation.jsx";
import { ApplicationDetailPage } from "./pages/ApplicationDetailPage.jsx";
import { ApplicationWorkspace } from "./pages/ApplicationWorkspace.jsx";
import { AnalysisModulePage } from "./pages/AnalysisModulePage.jsx";
import { AuthPage } from "./pages/AuthPage.jsx";
import { CoverLetterEmailPage } from "./pages/CoverLetterEmailPage.jsx";
import { ResumeModulePage } from "./pages/ResumeModulePage.jsx";

const pages = {
  dashboard: ApplicationWorkspace,
  resume: ResumeModulePage,
  cover: CoverLetterEmailPage,
  analysis: AnalysisModulePage
};

export function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [activeRunId, setActiveRunId] = useState("");
  const [moduleRunId, setModuleRunId] = useState("");
  const [authUser, setAuthUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(Boolean(getStoredToken()));
  const Page = pages[activePage] || ApplicationWorkspace;

  useEffect(() => {
    async function checkAuth() {
      if (!getStoredToken()) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        const payload = await fetchCurrentUser();
        setAuthUser(payload.user);
      } catch {
        clearStoredToken();
      } finally {
        setIsCheckingAuth(false);
      }
    }

    checkAuth();
  }, []);

  function openApplicationDetail(runId) {
    setActiveRunId(runId);
    setActivePage("detail");
  }

  function openRunModule(page, runId) {
    setModuleRunId(runId);
    setActivePage(page);
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Local logout still clears the browser session if the server call fails.
    }

    clearStoredToken();
    setAuthUser(null);
    setActivePage("dashboard");
    setActiveRunId("");
  }

  if (isCheckingAuth) {
    return <main className="authLoading">Loading workspace...</main>;
  }

  if (!authUser) {
    return <AuthPage onAuthenticated={setAuthUser} />;
  }

  if (activePage === "detail") {
    return (
      <div className="appFrame">
        <SidebarNavigation
          activePage="analysis"
          user={authUser}
          onLogout={handleLogout}
          onPageChange={setActivePage}
        />
        <section className="contentFrame">
          <ApplicationDetailPage
            runId={activeRunId}
            onBack={() => setActivePage("dashboard")}
            onOpenModule={openRunModule}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="appFrame">
      <SidebarNavigation
        activePage={activePage}
        user={authUser}
        onLogout={handleLogout}
        onPageChange={setActivePage}
      />
      <section className="contentFrame">
      <Page initialRunId={moduleRunId} onOpenRun={openApplicationDetail} />
      </section>
    </div>
  );
}
