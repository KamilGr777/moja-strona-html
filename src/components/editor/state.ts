"use client";
import { useCallback, useReducer } from "react";
import type { TimelineDoc } from "@/lib/timeline/types";

// Stan edytora z historią (cofnij / ponów). Zmiany „w trakcie” (przeciąganie) nie tworzą
// wpisów historii — wpis powstaje przy zatwierdzeniu (commit).

interface History {
  past: TimelineDoc[];
  present: TimelineDoc;
  future: TimelineDoc[];
  /** Stan sprzed rozpoczęcia przeciągania */
  pending: TimelineDoc | null;
  version: number;
}

type Action =
  | { type: "apply"; fn: (d: TimelineDoc) => TimelineDoc; transient?: boolean }
  | { type: "commit" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; doc: TimelineDoc };

const LIMIT = 120;

function reducer(s: History, a: Action): History {
  switch (a.type) {
    case "apply": {
      const next = a.fn(s.present);
      if (next === s.present) return s;
      if (a.transient) return { ...s, present: next, pending: s.pending ?? s.present, version: s.version + 1 };
      return { past: [...s.past, s.pending ?? s.present].slice(-LIMIT), present: next, future: [], pending: null, version: s.version + 1 };
    }
    case "commit":
      if (!s.pending) return s;
      return { past: [...s.past, s.pending].slice(-LIMIT), present: s.present, future: [], pending: null, version: s.version };
    case "undo": {
      if (!s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return { past: s.past.slice(0, -1), present: prev, future: [s.present, ...s.future], pending: null, version: s.version + 1 };
    }
    case "redo": {
      if (!s.future.length) return s;
      const [next, ...rest] = s.future;
      return { past: [...s.past, s.present], present: next, future: rest, pending: null, version: s.version + 1 };
    }
    case "reset":
      return { past: [], present: a.doc, future: [], pending: null, version: s.version + 1 };
  }
}

export function useEditorState(initial: TimelineDoc) {
  const [s, dispatch] = useReducer(reducer, { past: [], present: initial, future: [], pending: null, version: 0 });
  const apply = useCallback((fn: (d: TimelineDoc) => TimelineDoc, transient = false) => dispatch({ type: "apply", fn, transient }), []);
  const commit = useCallback(() => dispatch({ type: "commit" }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const reset = useCallback((doc: TimelineDoc) => dispatch({ type: "reset", doc }), []);
  return { doc: s.present, version: s.version, canUndo: s.past.length > 0, canRedo: s.future.length > 0, dragging: s.pending !== null, apply, commit, undo, redo, reset };
}

export interface EditorAsset {
  id: string;
  name: string;
  kind: "VIDEO" | "AUDIO" | "IMAGE";
  role: string;
  status: string;
  durationSec: number;
  width: number | null;
  height: number | null;
  hasAudio: boolean;
  sprite: { count: number; interval: number; frameWidth: number; frameHeight: number } | null;
  bpm: number | null;
  beats: number[];
  energyRises: number[];
  tags: string[];
  license: string | null;
}
