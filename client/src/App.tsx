import React, { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { EditorPage } from './pages/EditorPage';
import { LoginPage } from './pages/LoginPage';
import {
  getStoredToken,
  getStoredUser,
  clearStoredAuth,
  onUnauthorized,
} from './services/api';

export const App: React.FC = () => {
  // Authentication state with 30-day persistence
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(() =>
    getStoredUser()
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    Boolean(getStoredToken())
  );

  // Active document hash routing
  const [selectedDocId, setSelectedDocId] = useState<string | null>(() => {
    const hash = window.location.hash;
    const match = hash.match(/#doc=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  });

  // Global listener for 401 unauthorized responses
  useEffect(() => {
    onUnauthorized(() => {
      setIsAuthenticated(false);
      setCurrentUser(null);
    });
    return () => {
      onUnauthorized(null);
    };
  }, []);

  // Synchronize hash with selected document
  const handleOpenDocument = (id: string) => {
    setSelectedDocId(id);
    window.location.hash = `doc=${id}`;
  };

  const handleBackToDashboard = () => {
    setSelectedDocId(null);
    window.location.hash = '';
  };

  const handleLoginSuccess = (user: { username: string }) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    clearStoredAuth();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedDocId(null);
    window.location.hash = '';
  };

  // Listen to browser hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/#doc=([a-zA-Z0-9_-]+)/);
      setSelectedDocId(match ? match[1] : null);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // STRICT GATING: Always show login page if not logged in.
  // None of the workspace pages are accessible without valid credentials.
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="w-full h-full min-h-screen">
      {selectedDocId ? (
        <EditorPage
          documentId={selectedDocId}
          onBackToDashboard={handleBackToDashboard}
        />
      ) : (
        <Dashboard
          onOpenDocument={handleOpenDocument}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default App;
