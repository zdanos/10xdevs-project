/**
 * UserNav - User navigation component with logout functionality
 * Displays user email and provides logout action
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface UserNavProps {
  userEmail: string;
}

export default function UserNav({ userEmail }: UserNavProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Redirect to login page
        window.location.href = data.redirectTo || "/login";
      } else {
        // Handle error
        console.error("Logout failed:", data.error);
        alert(data.error || "Failed to logout. Please try again.");
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      alert("An unexpected error occurred. Please try again.");
      setIsLoggingOut(false);
    }
  }, [isLoggingOut]);

  return (
    <div className="relative">
      {/* User Menu Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
        aria-label="User menu"
        aria-expanded={showMenu}
      >
        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold">
          {userEmail.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:inline text-sm text-neutral-700 font-medium">{userEmail}</span>
        {/* Dropdown Icon */}
        <svg
          className={`w-4 h-4 text-neutral-500 transition-transform ${showMenu ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} aria-hidden="true" />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-20">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-neutral-200">
              <p className="text-sm font-medium text-neutral-900">Signed in as</p>
              <p className="text-sm text-neutral-600 truncate">{userEmail}</p>
            </div>

            {/* Logout Button */}
            <div className="px-2 py-2">
              <Button
                onClick={handleLogout}
                disabled={isLoggingOut}
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
