/**
 * Root application component.
 *
 * Responsibilities:
 * - Listen to Firebase authentication state
 * - Show a loading state while auth initializes
 * - Route the user to Login (signed out) or TaskBoard (signed in)
 */

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "./firebase";
import Login from "./components/Login";
import TaskBoard from "./components/TaskBoard";
import SwaggerDocs from "./swagger/SwaggerDocs";

export default function App() {
  const isApiDocsRoute = window.location.pathname === "/api-doc";

  if (isApiDocsRoute) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-bold">Task Manager API Docs</h1>
            <a
              href="/"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Back to App
            </a>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
            <SwaggerDocs />
          </div>

          <div className="mt-3 text-xs text-gray-500">
            OpenAPI JSON: <a className="underline" href="/openapi.json">/openapi.json</a>
          </div>
        </div>
      </div>
    );
  }

  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold">Loading…</div>
          <div className="text-sm text-gray-600">Initializing authentication</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {user ? <TaskBoard user={user} /> : <Login />}
    </div>
  );
}
