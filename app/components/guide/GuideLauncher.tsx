"use client";

import React, { useState, useEffect } from "react";

const IS_GUIDE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GUIDE !== "false";

export function GuideLauncher() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [PanelComp, setPanelComp] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!IS_GUIDE_ENABLED || !mounted) {
    return null;
  }

  const handleToggle = async () => {
    if (!isOpen) {
      if (!PanelComp) {
        const mod = await import("./GuidePanel");
        setPanelComp(() => mod.GuidePanel);
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Open SolHealth Orbit Assistant"
        aria-expanded={isOpen}
        className="guide-launcher"
      >
        <span>Orbit</span>
      </button>

      {isOpen && PanelComp && (
        <PanelComp
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}