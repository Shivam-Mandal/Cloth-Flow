// src/context/StyleContext.jsx
import React, { createContext, useState, useEffect, useCallback, useMemo } from "react";
import * as styleService from "../services/styleServices";

const StyleContext = createContext({});

export const StyleProvider = ({ children }) => {
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStyles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await styleService.getAllStyles();
      if (res && res.success) {
        setStyles(Array.isArray(res.data) ? res.data : []);
      } else {
        setError(res?.message || "Failed to fetch styles");
      }
      return res;
    } catch (err) {
      setError(err?.message || "Unknown error");
      return { success: false, message: err?.message || "Unknown error" };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  const createNewStyle = useCallback(async (name, steps = []) => {
    setLoading(true);
    setError(null);
    try {
      const res = await styleService.createStyle({ name, steps });
      if (res && res.success) {
        // prepend returned style (if available)
        setStyles((prev) => [res.data, ...prev]);
      } else {
        setError(res?.message || "Failed to create style");
      }
      return res;
    } catch (err) {
      setError(err?.message || "Unknown error");
      return { success: false, message: err?.message || "Unknown error" };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateExistingStyle = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await styleService.updateStyle(id, payload);
      if (res && res.success) {
        setStyles((prev) =>
          prev.map((p) => (p?._id === id || p?.id === id ? res.data : p))
        );
      } else {
        setError(res?.message || "Failed to update style");
      }
      return res;
    } catch (err) {
      setError(err?.message || "Unknown error");
      return { success: false, message: err?.message || "Unknown error" };
    } finally {
      setLoading(false);
    }
  }, []);

  const patchStyleSteps = useCallback(async (id, payload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await styleService.patchSteps(id, payload);
      if (res && res.success) {
        setStyles((prev) =>
          prev.map((p) => (p?._id === id || p?.id === id ? res.data : p))
        );
      } else {
        setError(res?.message || "Failed to patch style steps");
      }
      return res;
    } catch (err) {
      setError(err?.message || "Unknown error");
      return { success: false, message: err?.message || "Unknown error" };
    } finally {
      setLoading(false);
    }
  }, []);

  const removeStyle = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await styleService.deleteStyle(id);
      if (res && res.success) {
        setStyles((prev) => prev.filter((p) => p?._id !== id && p?.id !== id));
      } else {
        setError(res?.message || "Failed to delete style");
      }
      return res;
    } catch (err) {
      setError(err?.message || "Unknown error");
      return { success: false, message: err?.message || "Unknown error" };
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper: toggle a single step index for a style (calls patchSteps)
  const toggleStep = useCallback(async (styleId, stepIndex) => {
    const style = styles.find((s) => s?._id === styleId || s?.id === styleId);
    if (!style) return { success: false, message: "Style not found" };

    // Normalize steps: prefer style.steps, fallback to style.checks (legacy), else empty
    let rawSteps = Array.isArray(style.steps)
      ? style.steps
      : Array.isArray(style.checks)
      ? style.checks
      : [];

    // Convert legacy boolean array or mixed values into array of objects { enabled: boolean, ...rest }
    const newSteps = rawSteps.map((step) => {
      if (typeof step === "boolean") return { enabled: !!step };
      if (step == null) return { enabled: false };
      // if it's an object and already has enabled, keep it; otherwise ensure enabled exists
      return typeof step === "object" ? { ...(step || {}), enabled: !!step.enabled } : { enabled: !!step };
    });

    if (stepIndex < 0 || stepIndex >= newSteps.length)
      return { success: false, message: "Index out of range" };

    // toggle
    newSteps[stepIndex] = { ...newSteps[stepIndex], enabled: !newSteps[stepIndex].enabled };

    // Send to server via patchStyleSteps (which already updates local state on success)
    return await patchStyleSteps(styleId, { steps: newSteps });
  }, [styles, patchStyleSteps]);

  const value = useMemo(
    () => ({
      styles,
      loading,
      error,
      fetchStyles,
      createNewStyle,
      updateExistingStyle,
      patchStyleSteps,
      removeStyle,
      toggleStep,
      setStyles, // advanced usage
    }),
    [styles, loading, error, fetchStyles, createNewStyle, updateExistingStyle, patchStyleSteps, removeStyle, toggleStep]
  );

  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>;
};

export default StyleContext;
