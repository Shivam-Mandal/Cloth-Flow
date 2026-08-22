// src/components/AssignedTasksTable.jsx
import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, Play, Pause } from 'lucide-react';
import {
  fetchAssignedForMe,
  releaseAssignment,
  completeAssignment
} from '../services/assignmentServices';
import { toast } from 'react-toastify';
import { emitWorkerDataRefresh, subscribeWorkerDataRefresh } from '../../utils/workerRefresh';
import { useUser } from '../context/UserContext';

// local placeholder (put `placeholder.png` in your public/ folder)
const exampleThumb = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='%239ca3af'%3ENo Photo%3C/text%3E%3C/svg%3E";

// Cloudinary config — match StyleManagement
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_BASE = CLOUDINARY_CLOUD_NAME ? `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload` : '';

// Unified getPhotoUrl to match StyleManagement's logic (accepts string or { url })
const getPhotoUrl = (urlOrObj, { transform = '' } = {}) => {
  if (!urlOrObj) return '';
  // if it's an object with a url property (like uploaded result), prefer that
  if (typeof urlOrObj === 'object') {
    if (urlOrObj.secure_url) return String(urlOrObj.secure_url);
    if (urlOrObj.url) return String(urlOrObj.url);
    // if it's a cloudinary public_id stored as public_id or publicId
    if (urlOrObj.public_id || urlOrObj.publicId) {
      const pid = String(urlOrObj.public_id || urlOrObj.publicId).replace(/^\/+/, '');
      return transform && CLOUDINARY_BASE ? `${CLOUDINARY_BASE}/${transform}/${pid}` : (CLOUDINARY_BASE ? `${CLOUDINARY_BASE}/${pid}` : pid);
    }
  }

  const val = typeof urlOrObj === 'string' ? urlOrObj.trim() : '';
  if (!val) return '';

  // already absolute URL
  if (/^https?:\/\//i.test(val)) {
    if (transform && /res\.cloudinary\.com\/[^/]+\/image\/upload\/(.*)/i.test(val)) {
      // inject transform right after /upload/
      return val.replace(/(res\.cloudinary\.com\/[^/]+\/image\/upload\/)/i, `$1${transform}/`);
    }
    return val;
  }

  // relative string — treat as Cloudinary public_id (if configured)
  // Only treat as a Cloudinary public_id if it looks like one (not common words/attributes)
  // Cloudinary public IDs typically contain alphanumeric chars, hyphens, underscores, and dots
  // But exclude common style attributes, process names, and short generic words
  const commonWords = /^(xl|s|m|l|xs|xxl|red|blue|green|yellow|orange|black|white|cutting|packing|printing|finishing|stitching|available|low|medium|high|normal|pending|approved|rejected|completed|in.progress|delayed)$/i;
  const looksLikePublicId = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(val) && val.length > 3 && !commonWords.test(val);

  if (looksLikePublicId && CLOUDINARY_BASE) {
    const cleaned = val.replace(/^\/+/, '');
    return transform ? `${CLOUDINARY_BASE}/${transform}/${cleaned}` : `${CLOUDINARY_BASE}/${cleaned}`;
  }

  // fallback: return original value (might be a filename served by your server)
  return val;
};

// small helper to extract a sensible image URL from a task object
const getFirstImage = (task) => {
  try {
    // candidate paths
    const candidates = [
      task?.order?.style?.photos,
      task?.order?.styleSnapshot?.photos,
      task?.order?.images,
      task?.order?.photos,
      task?.photos,
      task?.image,
      task?.order?.previewImage
    ];

    for (const c of candidates) {
      if (!c) continue;
      if (typeof c === 'string' && c.trim()) {
        const url = getPhotoUrl(c.trim());
        if (url) return url;
      }
      if (Array.isArray(c) && c.length) {
        for (const item of c) {
          if (typeof item === 'string' && item.trim()) {
            const url = getPhotoUrl(item.trim());
            if (url) return url;
          }
          if (item?.secure_url) return item.secure_url;
          if (item?.url) return item.url;
          if (item?.public_id) {
            const url = getPhotoUrl(item);
            if (url) return url;
          }
        }
      }
      if (typeof c === 'object') {
        if (c.secure_url) return c.secure_url;
        if (c.url) return c.url;
        if (c.public_id) {
          const url = getPhotoUrl(c);
          if (url) return url;
        }
      }
    }
  } catch {
    // ignore
  }
  return exampleThumb;
};

const getPiecesCount = (task) => {
  if (task == null) return '—';
  if (typeof task.totalPieces === 'number') return task.totalPieces;
  if (Array.isArray(task.pieces)) return task.pieces.length;
  if (task.pieces && typeof task.pieces === 'object') {
    // sum numeric values if pieces is an object like { color: { size: qty } }
    try {
      let sum = 0;
      const vals = Object.values(task.pieces);
      for (const v of vals) {
        if (typeof v === 'number') sum += v;
        else if (typeof v === 'object') {
          for (const vv of Object.values(v)) {
            sum += Number(vv) || 0;
          }
        }
      }
      return sum || '—';
    } catch {
      return '—';
    }
  }
  return '—';
};

const getSubOrderCode = (task) => {
  const sub = task?.subOrder;
  if (sub && typeof sub === 'object') {
    return sub.subOrderCode || sub.code || sub.suborderCode || null;
  }
  return null;
};

const shortId = (val) => {
  if (!val) return '—';
  const s = String(val);
  return s.length <= 6 ? s : s.slice(-6);
};

const colorMap = {
  black: '#111827',
  blue: '#2563eb',
  green: '#16a34a',
  orange: '#f97316',
  purple: '#7c3aed',
  red: '#ef4444',
  white: '#ffffff',
  yellow: '#eab308',
  navy: '#1e3a8a',
  pink: '#ec4899',
  gray: '#6b7280',
  grey: '#6b7280',
  brown: '#78350f',
  beige: '#f5f5dc',
  maroon: '#800000',
  cyan: '#06b6d4',
  teal: '#0d9488',
  indigo: '#4f46e5',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  emerald: '#10b981',
  sky: '#0284c7'
};

const getColorHex = (name) => {
  if (!name || name === '—') return null;
  const key = String(name).trim().toLowerCase();
  if (colorMap[key]) return colorMap[key];
  if (/^#([0-9a-f]{3}){1,2}$/i.test(key)) return key;
  if (/^rgb/i.test(key)) return key;
  return key;
};

const ColorBadge = ({ color }) => {
  if (!color || color === '—') return <span>—</span>;
  const hex = getColorHex(color);
  const isLight = hex && (hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === 'white' || hex.toLowerCase() === '#f8fafc');

  return (
    <div className="inline-flex items-center gap-1.5 font-medium">
      {hex && (
        <span
          className={`h-3 w-3 rounded-full shrink-0 ${
            isLight ? 'border border-gray-300' : 'border border-black/10'
          }`}
          style={{ backgroundColor: hex }}
          title={color}
        />
      )}
      <span>{color}</span>
    </div>
  );
};

const extractTaskDetails = (task) => {
  let color = '—';
  let size = '—';
  try {
    if (task && task.pieces && typeof task.pieces === 'object' && !Array.isArray(task.pieces)) {
      const colors = Object.keys(task.pieces);
      if (colors.length > 0) {
        color = colors[0];
        const sizesObj = task.pieces[color] || {};
        const sizes = Object.keys(sizesObj);
        if (sizes.length > 0) size = sizes[0];
      }
    } else if (Array.isArray(task?.pieces) && task.pieces.length > 0) {
      const p = task.pieces[0];
      color = p.color ?? p.colour ?? p.colorName ?? '—';
      size = p.size ?? p.sizeName ?? '—';
    } else if (task?.color) {
      color = task.color;
      size = task?.size || '—';
    } else if (task?.subOrder?.color) {
      color = task.subOrder.color;
      size = task.subOrder?.size || '—';
    }
  } catch {
    // ignore
  }

  const styleName = task?.order?.styleSnapshot?.name || task?.order?.style?.name || task?.style?.name || task?.subOrder?.styleName || '—';
  const fabricName = task?.order?.fabric || task?.order?.styleSnapshot?.fabric || task?.order?.style?.fabric || task?.subOrder?.fabric || task?.fabric || '—';

  return { color: String(color), size: String(size), styleName, fabricName };
};

export const AssignedTasksTable = () => {
  const { user } = useUser();
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState({ fetch: false, action: false });
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [completionModal, setCompletionModal] = useState({ open: false, assignment: null });
  const [completionData, setCompletionData] = useState({ completedPieces: '', damagedPieces: '', damagedReason: '' });
  const [modalError, setModalError] = useState(null);
  const lastRefreshRef = useRef(0);
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
  const CLOUDINARY_BASE = CLOUDINARY_CLOUD_NAME ? `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload` : '';
  const canSubmitExcessPieces = Boolean(user?.allowExcessPieces);

  const resolveCandidateToUrl = (c) => {
    if (!c) return '';
    if (typeof c === 'object') {
      if (c.secure_url) return String(c.secure_url);
      if (c.url) return String(c.url);
      if (c.path) return String(c.path);
      if (c.public_id || c.publicId) return String(c.public_id || c.publicId).replace(/^\/+/, '');
      return '';
    }
    const s = String(c).trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    // Only treat as a Cloudinary public_id if it looks like one (not common words/attributes)
    // Cloudinary public IDs typically contain alphanumeric chars, hyphens, underscores, and dots
    // But exclude common style attributes, process names, and short generic words
    const commonWords = /^(xl|s|m|l|xs|xxl|red|blue|green|yellow|orange|black|white|cutting|packing|printing|finishing|stitching|available|low|medium|high|normal|pending|approved|rejected|completed|in.progress|delayed)$/i;
    const looksLikePublicId = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(s) && s.length > 3 && !commonWords.test(s);

    if (looksLikePublicId && CLOUDINARY_BASE) {
      return `${CLOUDINARY_BASE}/${s.replace(/^\/+/, '')}`;
    }
    return '';
  };

  const collectImageCandidatesFromTask = (task) => {
    const out = [];
    const push = (v) => { if (v !== undefined && v !== null) out.push(v); };

    try {
      push(task?.order?.style?.photos);
      push(task?.order?.styleSnapshot?.photos);
      push(task?.order?.images);
      push(task?.order?.photos);
      push(task?.order?.previewImage);
      push(task?.photos);
      push(task?.image);
      push(task?.order?.style?.photo);
      // shallow deep-collect strings that look like images
      const walk = (v, seen = new Set()) => {
        if (v === null || v === undefined) return;
        if (typeof v === 'object') {
          if (seen.has(v)) return;
          seen.add(v);
          if (Array.isArray(v)) v.forEach(i => walk(i, seen));
          else {
            for (const k of Object.keys(v)) walk(v[k], seen);
          }
          return;
        }
        if (typeof v === 'string') {
          if (/^https?:\/\//i.test(v) || /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(v) || /res\.cloudinary\.com\/.+\/image\/.+/.test(v)) out.push(v);
        }
      };
      walk(task);
    } catch {
      // ignore
    }

    // flatten arrays and dedupe
    const flat = [];
    for (const c of out.flatMap(x => Array.isArray(x) ? x : [x])) {
      if (!c) continue;
      const key = typeof c === 'string' ? c : JSON.stringify(c);
      if (!flat.some(f => (typeof f === 'string' ? f : JSON.stringify(f)) === key)) flat.push(c);
    }
    return flat;
  };

  const verifyUrls = async (urls) => {
    const checks = await Promise.all(urls.map(async (u) => {
      const url = resolveCandidateToUrl(u);
      if (!url) return null;
      try {
        const res = await fetch(url, { method: 'HEAD' });
        return res && res.ok ? url : null;
      } catch {
        return null;
      }
    }));
    return checks.filter(Boolean);
  };

  const openModalWithTask = async (task, startIndex = 0) => {
    setModalLoading(true);
    try {
      const candidates = collectImageCandidatesFromTask(task);
      const final = await verifyUrls(candidates);
      const images = final.length ? final : [exampleThumb];
      setModalIndex(Math.max(0, Math.min(startIndex || 0, images.length - 1)));
      setModalImage(images[Math.max(0, Math.min(startIndex || 0, images.length - 1))]);
      // store full array in state by reusing modalImage temporarily as object? keep a separate state
      setModalImages(images);
      setModalOpen(true);
    } finally {
      setModalLoading(false);
    }
  };

  // store images array for modal navigation
  const [modalImages, setModalImages] = useState([]);

  const gotoNextModal = () => setModalIndex(i => {
    const n = modalImages.length ? (i + 1) % modalImages.length : 0;
    setModalImage(modalImages[n]);
    return n;
  });
  const gotoPrevModal = () => setModalIndex(i => {
    const n = modalImages.length ? (i - 1 + modalImages.length) % modalImages.length : 0;
    setModalImage(modalImages[n]);
    return n;
  });

  const loadMine = async () => {
    setLoading(l => ({ ...l, fetch: true }));
    setError(null);
    try {
      const res = await fetchAssignedForMe({ status: 'assigned' });
      const list = Array.isArray(res) ? res : (res?.assignments ?? (res?.data ?? []));
      const activeList = list.filter(task =>
        task.status === 'assigned' || task.status === 'in_progress'
      );
      setMine(activeList);
      lastRefreshRef.current = Date.now();
    } catch (e) {
      console.error('Failed to load my assignments', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load assignments');
    } finally {
      setLoading(l => ({ ...l, fetch: false }));
    }
  };

  useEffect(() => { loadMine(); }, []);

  useEffect(() => {
    const refreshIfStale = ({ force = false } = {}) => {
      if (!force && Date.now() - lastRefreshRef.current < 20000) return;
      loadMine();
    };

    const unsubscribe = subscribeWorkerDataRefresh(({ scope, force }) => {
      if (!scope || scope === 'worker' || scope === 'assignments') {
        refreshIfStale({ force: Boolean(force) });
      }
    });

    const revalidateVisibleState = () => {
      if (document.visibilityState === 'visible') {
        refreshIfStale();
      }
    };

    window.addEventListener('focus', revalidateVisibleState);
    document.addEventListener('visibilitychange', revalidateVisibleState);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', revalidateVisibleState);
      document.removeEventListener('visibilitychange', revalidateVisibleState);
    };
  }, []);

  const handleDeselect = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to release this task? It will return to available tasks.')) return;
    setLoading(l => ({ ...l, action: true }));
    setError(null);
    try {
      await releaseAssignment(assignmentId);
      toast.success('Released to available tasks');
      await loadMine();
      emitWorkerDataRefresh({ scope: 'assignments', reason: 'release', force: true });
    } catch (e) {
      console.error('release failed', e);
      setError(e?.response?.data?.error || e?.response?.data?.message || e.message || 'Failed to release assignment');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  const handleComplete = async (assignmentId) => {
    const assignment = mine.find(a => (a._id || a.id) === assignmentId);
    if (!assignment) return;
    setCompletionData({ completedPieces: String(assignment.totalPieces ?? ''), damagedPieces: '0', damagedReason: '' });
    setModalError(null);
    setCompletionModal({ open: true, assignment });
  };

  const submitCompletion = async () => {
    const { assignment } = completionModal;
    if (!assignment) return;
    setModalError(null);
    const completedPieces = Number(completionData.completedPieces || 0);
    const damagedPieces = Number(completionData.damagedPieces || 0);
    const totalPieces = Number(assignment.totalPieces || 0);

    if (completionData.completedPieces === '' || isNaN(completedPieces) || completedPieces < 0 || damagedPieces < 0) {
      setModalError('Enter valid piece counts.');
      return;
    }

    if (!canSubmitExcessPieces && completedPieces + damagedPieces > totalPieces) {
      setModalError(`You cannot submit more than ${totalPieces} pieces.`);
      return;
    }

    if (completedPieces < totalPieces && (completedPieces + damagedPieces) < totalPieces) {
      setModalError(`Pieces must sum to ${totalPieces}.`);
      return;
    }

    setLoading(l => ({ ...l, action: true }));
    try {
      const payload = {
        completedPieces,
        damagedPieces,
        damagedReason: completionData.damagedReason
      };
      await completeAssignment(assignment._id || assignment.id, payload);
      toast.success('Assignment completed');
      setCompletionModal({ open: false, assignment: null });
      setModalError(null);
      await loadMine();
      emitWorkerDataRefresh({ scope: 'worker', reason: 'complete-assignment', force: true });
    } catch (e) {
      console.error('complete failed', e);
      setModalError(e?.response?.data?.message || e?.response?.data?.error || e.message || 'Failed to complete assignment');
    } finally {
      setLoading(l => ({ ...l, action: false }));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Play className="w-5 h-5 text-blue-600" />;
      case 'paused': return <Pause className="w-5 h-5 text-yellow-600" />;
      default: return <span className="text-sm text-gray-500">•</span>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Tasks</h2>
        <div className="text-sm text-gray-600">{mine.length} task(s)</div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{String(error)}</div>}

      <div className="bg-white p-4 rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="text-left text-sm text-gray-600">
              <th className="px-3 py-2">Photo</th>
              <th className="px-3 py-2">SKU / Chunk</th>
              <th className="px-3 py-2">Style</th>
              <th className="px-3 py-2">Fabric</th>
              <th className="px-3 py-2">Color</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Total Pieces</th>
              <th className="px-3 py-2">Completed</th>
              <th className="px-3 py-2">Damaged</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Deadline</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading.fetch ? (
              <>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-3 py-3"><div className="h-10 w-10 bg-gray-200 rounded" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-10" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-3 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-3 py-3"><div className="h-8 bg-gray-200 rounded w-24" /></td>
                  </tr>
                ))}
              </>
            ) : mine.length === 0 ? (
              <tr><td colSpan={12} className="px-3 py-6 text-center text-sm text-gray-500">You haven't selected any tasks yet.</td></tr>
            ) : (
              mine.map(task => {
                const { color, size, styleName, fabricName } = extractTaskDetails(task);
                return (
                  <tr key={task._id || task.id}>
                    <td className="px-3 py-3 align-top">
                      <div className="w-16 h-10 bg-gray-50 rounded overflow-hidden flex items-center justify-center border">
                        <img src={getFirstImage(task)} alt="thumb" className="object-cover w-full h-full cursor-pointer" onClick={() => { openModalWithTask(task, 0); }} />
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-sm">
                      <div className="font-medium">{task.order?.orderId ?? task.orderId ?? '—'}</div>
                      <div className="text-xs text-gray-500">
                        SubOrder: {getSubOrderCode(task) || shortId(task?.subOrder?._id || task?.subOrder || task?._id)}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top text-sm font-medium text-gray-900">{styleName}</td>
                    <td className="px-3 py-3 align-top text-sm text-gray-700">{fabricName}</td>
                    <td className="px-3 py-3 align-top text-sm">
                      <ColorBadge color={color} />
                    </td>
                    <td className="px-3 py-3 align-top text-sm">{size}</td>
                    <td className="px-3 py-3 align-top text-sm">{getPiecesCount(task)}</td>
                    <td className="px-3 py-3 align-top text-sm">{task.completedPieces || 0}</td>
                    <td className="px-3 py-3 align-top text-sm">{task.damagedPieces || 0}</td>
                    <td className="px-3 py-3 align-top text-sm flex items-center gap-2">{getStatusIcon(task.status)} <span>{task.status || '—'}</span></td>
                    <td className="px-3 py-3 align-top text-sm">{task.order?.deadline ? new Date(task.order.deadline).toLocaleString() : (task.deadline ? new Date(task.deadline).toLocaleString() : '—')}</td>
                    <td className="px-3 py-3 align-top text-sm">
                      {task.status !== 'completed' ? (
                        <>
                          <button onClick={() => handleComplete(task._id || task.id)} disabled={loading.action} className="px-3 py-1 rounded bg-green-600 text-white text-sm mr-2">Complete</button>
                          <button onClick={() => handleDeselect(task._id || task.id)} disabled={loading.action} className="px-3 py-1 rounded bg-yellow-50 text-sm">Deselect</button>
                        </>
                      ) : (
                        <div className="text-sm text-gray-500">Completed</div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={loadMine} disabled={loading.fetch} className="px-4 py-2 rounded bg-gray-100 text-sm">Refresh</button>
        {loading.fetch && <div className="text-sm text-gray-500">Loading...</div>}
        {loading.action && <div className="text-sm text-gray-500">Processing...</div>}
      </div>

      {/* Image modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black bg-opacity-60" onClick={() => setModalOpen(false)}>
          <div className="relative max-w-3xl w-full cursor-default mx-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModalOpen(false)} aria-label="Close" className="absolute top-2 right-2 text-white bg-gray-800 bg-opacity-50 rounded-full p-2">×</button>

            {modalLoading ? (
              <div className="flex flex-col items-center justify-center p-8">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
                <div className="text-white text-sm">Loading images…</div>
              </div>
            ) : (
              <>
                <img src={modalImage || exampleThumb} alt="preview" className="w-full max-h-[80vh] object-contain rounded" />
                {modalImages.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); gotoPrevModal(); }} aria-label="Previous" className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white bg-gray-800 bg-opacity-50 rounded-full p-2">‹</button>
                    <button onClick={(e) => { e.stopPropagation(); gotoNextModal(); }} aria-label="Next" className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white bg-gray-800 bg-opacity-50 rounded-full p-2">›</button>
                  </>
                )}
                <div className="mt-2 text-center text-sm text-white">{modalIndex + 1} / {modalImages.length}</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {completionModal.open && completionModal.assignment && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 shadow-2xl">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Complete Assignment</h3>
            <p className="text-sm text-gray-600 mb-4">
              Assignment: {getSubOrderCode(completionModal.assignment) || shortId(completionModal.assignment?.subOrder?._id || completionModal.assignment?.subOrder || completionModal.assignment?._id)} — {completionModal.assignment.stage || completionModal.assignment.process}
            </p>
            <p className="text-sm text-gray-600 mb-4">Total Pieces: {completionModal.assignment.totalPieces}</p>

            {modalError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg font-medium">
                {modalError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Completed Pieces</label>
                <input
                  type="number"
                  min="0"
                  max={!canSubmitExcessPieces ? Number(completionModal.assignment?.totalPieces || 0) : undefined}
                  value={completionData.completedPieces}
                  onChange={(e) => {
                    let val = e.target.value;
                    const total = Number(completionModal.assignment?.totalPieces || 0);
                    if (!canSubmitExcessPieces && val !== '' && !isNaN(Number(val))) {
                      if (Number(val) > total) {
                        val = String(total);
                        setModalError(`You do not have permission to submit excess pieces (max: ${total}).`);
                      } else {
                        setModalError(null);
                      }
                    }
                    const num = Number(val);
                    let autoDamaged = completionData.damagedPieces;
                    if (!isNaN(num) && val !== '') {
                      if (num < total) {
                        autoDamaged = String(Math.max(0, total - num));
                      } else {
                        autoDamaged = '0';
                      }
                    }
                    setCompletionData(prev => ({
                      ...prev,
                      completedPieces: val,
                      damagedPieces: autoDamaged
                    }));
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Damaged Pieces</label>
                <input
                  type="number"
                  min="0"
                  max={!canSubmitExcessPieces ? Math.max(0, Number(completionModal.assignment?.totalPieces || 0) - Number(completionData.completedPieces || 0)) : undefined}
                  value={completionData.damagedPieces}
                  onChange={(e) => {
                    let val = e.target.value;
                    const total = Number(completionModal.assignment?.totalPieces || 0);
                    const completed = Number(completionData.completedPieces || 0);
                    if (!canSubmitExcessPieces && val !== '' && !isNaN(Number(val))) {
                      const maxDamaged = Math.max(0, total - completed);
                      if (Number(val) > maxDamaged) {
                        val = String(maxDamaged);
                        setModalError(`Total pieces (completed + damaged) cannot exceed ${total}.`);
                      } else {
                        setModalError(null);
                      }
                    }
                    setCompletionData(prev => ({ ...prev, damagedPieces: val }));
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Reason for Damaged Pieces (optional)</label>
                <textarea
                  value={completionData.damagedReason}
                  onChange={(e) => setCompletionData(prev => ({ ...prev, damagedReason: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  rows="3"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setCompletionModal({ open: false, assignment: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={submitCompletion}
                disabled={
                  loading.action ||
                  completionData.completedPieces === '' ||
                  isNaN(Number(completionData.completedPieces)) ||
                  Number(completionData.completedPieces) < 0 ||
                  (!canSubmitExcessPieces &&
                    Number(completionData.completedPieces || 0) + Number(completionData.damagedPieces || 0) > Number(completionModal.assignment?.totalPieces || 0)) ||
                  (Number(completionData.completedPieces) < Number(completionModal.assignment?.totalPieces || 0) &&
                    (Number(completionData.completedPieces) + Number(completionData.damagedPieces || 0)) < Number(completionModal.assignment?.totalPieces || 0))
                }
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignedTasksTable;
