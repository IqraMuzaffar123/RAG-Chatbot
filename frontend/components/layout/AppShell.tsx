"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    if (mobileOpen) setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-50 flex items-center justify-center cursor-pointer"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "rgba(15,15,35,0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#94a3b8",
            backdropFilter: "blur(8px)",
          }}
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-50"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="h-full"
            style={{ width: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-full">
              <Sidebar />
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                style={{ background: "none", border: "none" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      {!isMobile && <Sidebar />}

      {/* Main content */}
      <main className="flex-1 min-w-0 h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}
