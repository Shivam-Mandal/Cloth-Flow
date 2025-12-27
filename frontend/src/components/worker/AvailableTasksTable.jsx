// src/components/AvailableTasksTable.jsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { Plus } from 'lucide-react';
import {
  fetchAvailableAssignments,
  fetchAvailableForMe,
  claimAssignment,
  fetchAssignedForMe
} from '../services/assignmentServices';
import { getWorker } from '../services/workerService';
import { toast } from 'react-toastify';

// local thumbnail fallback — put placeholder.png in your public/ folder
const exampleThumb = '/placeholder.png';

// Cloudinary config — match StyleManagement
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_BASE = CLOUDINARY_CLOUD_NAME ? `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload` : '';

// Small helpers
const normalize = (s) => (s === null || s === undefined ? '' : String(s).trim().toLowerCase());

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

// Simple deep collector (keeps previous behavior)
const collectImageCandidates = (obj, seen = new Set()) => {
  const out = [];
  const walk = (v) => {
    if (v === undefined || v === null) return;
    if (typeof v === 'object') {
      if (seen.has(v)) return;
      seen.add(v);
    }
    if (typeof v === 'object') {
      if (v.secure_url) out.push(v.secure_url);
      if (v.url) out.push(v.url);
      if (v.path) out.push(v.path);
      if (v.public_id) out.push(v.public_id);
      if (Array.isArray(v.photos)) v.photos.forEach(p => walk(p));
      for (const k in v) walk(v[k]);
      return;
    }
    if (typeof v === 'string') {
      if (/^https?:\/\//i.test(v) || /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(v) || /^[\w\-\/]+[\w\-]$/.test(v)) {
        out.push(v);
      }
    }
    if (Array.isArray(v)) v.forEach(item => walk(item));
  };
  walk(obj);
  return Array.from(new Set(out));
};

// small constants for transforms if you want Cloudinary transforms (optional)
const THUMB_TRANSFORM = 'w_140,h_140,c_fill';
const FULL_TRANSFORM = ''; // keep empty or set as needed

// in-memory map to cache resolved candidate list per chunk id (not final URLs)
const imageCandidatesCache = new Map();

const resolveAllImages = (chunk) => {
  if (!chunk) return { candidates: [exampleThumb] };

  const cached = imageCandidatesCache.get(chunk._id);
  if (cached) return cached;

  // gather candidate sources (preserve objects and strings)
  const candidates = [];

  const pushIf = (v) => { if (v !== undefined && v !== null) candidates.push(v); };

  // Primary source: Style photos (most reliable for Cloudinary)
  if (chunk.order?.style?.photos) {
    pushIf(chunk.order.style.photos);
  }

  // Secondary sources: Order level images
  pushIf(chunk.order?.images);
  pushIf(chunk.order?.photos);
  pushIf(chunk.order?.image);
  pushIf(chunk.order?.previewImage);
  pushIf(chunk.order?.styleSnapshot?.images);
  pushIf(chunk.order?.styleSnapshot?.photos);
  
  // Tertiary: Chunk level images
  pushIf(chunk.pieces);
  pushIf(chunk.photos);
  pushIf(chunk.image);

  const deep = collectImageCandidates(chunk);
  deep.forEach(x => pushIf(x));

  // flatten arrays inside candidates, dedupe by stringified value
  const flat = [];
  for (const c of candidates.flatMap(c => Array.isArray(c) ? c : [c])) {
    if (c === undefined || c === null) continue;
    // use stringified key for dedupe but keep original item
    const key = (typeof c === 'string') ? c : JSON.stringify(c);
    if (!flat.some(f => ((typeof f === 'string' ? f : JSON.stringify(f)) === key))) flat.push(c);
  }

  const out = { candidates: flat.length ? flat : [exampleThumb] };
  imageCandidatesCache.set(chunk._id, out);
  return out;
};

/* Robust SKU extractor kept as-is (unchanged) */
const extractSkuColorSize = (chunk, orderKey) => {
  try {
    if (chunk && chunk.pieces && typeof chunk.pieces === 'object' && !Array.isArray(chunk.pieces)) {
      const colors = Object.keys(chunk.pieces);
      if (colors.length > 0) {
        const color = colors[0];
        const sizesObj = chunk.pieces[color] || {};
        const sizes = Object.keys(sizesObj);
        const size = sizes.length > 0 ? sizes[0] : '—';
        const count = sizesObj[size] ?? chunk.totalPieces ?? 0;
        const skuId = chunk.subOrder?._id ?? chunk.subOrder ?? chunk.sku ?? chunk.skuId ?? orderKey;
        return { sku: String(skuId), color: String(color), size: String(size), pieces: Number(count) };
      }
    }

    if (Array.isArray(chunk.pieces) && chunk.pieces.length > 0) {
      const p = chunk.pieces[0];
      const sku = p.sku ?? p.skuId ?? p.sku_id ?? chunk.sku ?? chunk.skuId ?? orderKey;
      return {
        sku: String(sku),
        color: String(p.color ?? p.colour ?? p.colorName ?? '—'),
        size: String(p.size ?? p.sizeName ?? '—'),
        pieces: Number(p.count ?? p.qty ?? p.quantity ?? chunk.totalPieces ?? 0)
      };
    }
  } catch (e) {
    // fallthrough
  }
  const fallbackSku = chunk.sku ?? chunk.skuId ?? orderKey ?? '—';
  const fallbackPieces = Number(chunk.totalPieces ?? 0);
  return { sku: String(fallbackSku), color: '—', size: '—', pieces: fallbackPieces };
};

/* -------------------------
   Row component (memoized) — uses getPhotoUrl for rendering
   ------------------------- */
const TaskRow = React.memo(({
  chunk,
  orderKey,
  status = 'Available',
  activeAssignedId,
  claimingId,
  onClaim,
  workerId,
  onOpenGallery // (images: string[], startIndex:number)
}) => {
  const resolved = useMemo(() => resolveAllImages(chunk), [chunk?._id]); // depend only on id
  const candidates = resolved.candidates || [exampleThumb];

  // map candidates -> thumbnail URLs using getPhotoUrl (same semantics as StyleManagement)
  const thumbs = useMemo(() => candidates.map(c => {
    // If candidate is an object with url/secure_url, getPhotoUrl will return it.
    // Prefer thumb transform for Cloudinary public_ids
    const u = getPhotoUrl(c, { transform: THUMB_TRANSFORM });
    return u || exampleThumb;
  }), [candidates]);

  const firstThumb = thumbs[0] || exampleThumb;
  const thumbCount = thumbs.length;
  const { sku, color, size, pieces } = useMemo(() => extractSkuColorSize(chunk, orderKey), [chunk, orderKey]);
  const disabled = Boolean(activeAssignedId) || claimingId === chunk._id || !workerId;
  const badgeClass = status === 'Current' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';

  // Prefetch thumbs once to stabilize browser caching and reduce flicker
  useEffect(() => {
    const imgs = [];
    for (const url of thumbs) {
      try {
        const im = new Image();
        im.decoding = 'async';
        im.onload = () => { /* noop */ };
        im.onerror = () => { /* noop */ };
        im.src = url || exampleThumb;
        imgs.push(im);
      } catch (e) {
        // ignore
      }
    }
    return () => { imgs.length = 0; };
  }, [thumbs]);

  const handleImgError = (e) => {
    const el = e.currentTarget;
    if (el.dataset.fallback === '1') return;
    if (el.src === exampleThumb) {
      el.dataset.fallback = '1';
      return;
    }
    el.dataset.fallback = '1';
    el.src = exampleThumb;
  };

  return (
    <tr key={chunk._id}>
      <td className="px-3 py-2 align-top">
        <div className="relative inline-block">
          <img
            src={firstThumb}
            alt={`${sku}-image`}
            className="h-12 w-12 object-cover rounded cursor-pointer"
            onError={handleImgError}
            // pass original candidates to gallery so modal resolves full-size images
            onClick={() => onOpenGallery && onOpenGallery(candidates, 0)}
          />
        </div>
      </td>

      <td className="px-3 py-2 align-top text-sm">
        <div className="font-medium">{orderKey}</div>
      </td>

      <td className="px-3 py-2 align-top text-sm">{pieces}</td>
      <td className="px-3 py-2 align-top text-sm">{color}</td>
      <td className="px-3 py-2 align-top text-sm">{size}</td>

      <td className="px-3 py-2 align-top text-sm">
        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${badgeClass}`}>{chunk.status ?? status}</span>
      </td>

      <td className="px-3 py-2 align-top text-sm">
        <button
          onClick={() => onClaim(chunk._id)}
          disabled={disabled || (chunk.status === 'assigned' || chunk.status === 'Current')}
          className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${disabled || (chunk.status === 'assigned') ? 'bg-gray-200 text-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          <Plus className="w-4 h-4 mr-2" />
          {claimingId === chunk._id ? 'Claiming…' : (!workerId ? 'Sign in to claim' : 'Claim')}
        </button>
      </td>
    </tr>
  );
});

/* -------------------------
   Main component (unchanged except it uses new TaskRow)
   ------------------------- */
export const AvailableTasksTable = ({ workerId, workerCategory: initialWorkerCategory = null }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);

  // Gallery state for viewing all images of a task
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const [workerCategory, setWorkerCategory] = useState(initialWorkerCategory);
  const [workerLoading, setWorkerLoading] = useState(!initialWorkerCategory && Boolean(workerId));

  const [activeAssigned, setActiveAssigned] = useState(null);
  const [assignedLoading, setAssignedLoading] = useState(true);

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const loadWorker = useCallback(async (signal) => {
    if (initialWorkerCategory) {
      setWorkerCategory(initialWorkerCategory);
      setWorkerLoading(false);
      return;
    }
    if (!workerId) {
      setWorkerCategory(null);
      setWorkerLoading(false);
      return;
    }

    setWorkerLoading(true);
    try {
      const w = await getWorker(workerId, { signal });
      const workerObj = w?.data || w?.worker || w;
      const wt = workerObj?.workerType ?? workerObj?.category ?? workerObj?.type ?? workerObj?.worker_type ?? null;
      if (mountedRef.current) setWorkerCategory(wt ?? null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('loadWorker error', err);
      toast.error('Failed to load worker profile — showing all tasks');
      if (mountedRef.current) setWorkerCategory(null);
    } finally {
      if (mountedRef.current) setWorkerLoading(false);
    }
  }, [workerId, initialWorkerCategory]);

  const fetchAvailable = useCallback(async (signal) => {
    if (workerLoading) return [];
    setLoading(true);
    try {
      let data = null;
      if (workerCategory) {
        try { data = await fetchAvailableForMe({ category: workerCategory, signal }); } catch (e) { data = null; }
      }
      if (!data) {
        try { data = await fetchAvailableForMe({}, { signal }); } catch (e) { data = null; }
      }
      if (!data) data = await fetchAvailableAssignments({ signal });

      const arr = Array.isArray(data) ? data : (data?.assignments || data?.tasks || data?.data || []);

      // keep only fields that frontend needs and normalize
      const normalized = arr.map(a => ({
        _id: a._id,
        order: a.order,
        subOrder: a.subOrder ?? a.suborder,
        pieces: a.pieces,
        totalPieces: a.totalPieces ?? a.total_quantity ?? a.totalQuantity,
        stage: a.stage,
        status: a.status ?? 'available',
        requiredRole: a.requiredRole,
        createdAt: a.createdAt
      }));

      // filter by workerCategory on client side when server didn't
      const wanted = normalize(workerCategory);
      const filtered = wanted ? normalized.filter(a => {
        const stage = normalize(a.stage);
        const cat = normalize(a.order?.category ?? a.order?.orderCategory);
        const requiredRole = normalize(a.requiredRole ?? '');
        const orderName = normalize(a.order?.styleSnapshot?.name);
        return stage.includes(wanted) || cat.includes(wanted) || requiredRole.includes(wanted) || orderName.includes(wanted);
      }) : normalized;

      if (mountedRef.current) setAssignments(filtered);
      return filtered;
    } catch (err) {
      if (err.name === 'AbortError') return [];
      console.error('fetchAvailable error', err);
      toast.error('Failed to load tasks');
      return [];
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [workerCategory, workerLoading]);

  const loadAssignedForMe = useCallback(async (signal) => {
    setAssignedLoading(true);
    try {
      const data = await fetchAssignedForMe({ status: 'assigned' }, { signal });
      const assigned = Array.isArray(data) ? data : (data?.assignments || data?.tasks || data?.data || []);
      if (mountedRef.current) setActiveAssigned(assigned.length > 0 ? assigned[0] : null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Failed to load assigned for me', err);
      if (mountedRef.current) setActiveAssigned(null);
    } finally {
      if (mountedRef.current) setAssignedLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      await loadWorker(controller.signal);
      await fetchAvailable(controller.signal);
      await loadAssignedForMe(controller.signal);
    })();
    return () => controller.abort();
  }, [loadWorker, fetchAvailable, loadAssignedForMe]);

  // Open gallery with array of image URLs (or candidates). startIndex optional.
  const verifyUrls = async (urls) => {
    // verify each URL exists (HEAD request). Cloudinary supports HEAD with CORS.
    const checks = await Promise.all(urls.map(async (u) => {
      try {
        const res = await fetch(u, { method: 'HEAD' });
        return res && res.ok ? u : null;
      } catch (e) {
        return null;
      }
    }));
    return checks.filter(Boolean);
  };

  const openGallery = async (imgs = [], startIndex = 0) => {
    setGalleryLoading(true);
    // Normalize input to array and resolve to full-size URLs
    const raw = Array.isArray(imgs) ? imgs : [imgs];
    const resolved = raw
      .map(i => (getPhotoUrl(i, { transform: FULL_TRANSFORM }) || '').trim())
      .filter(u => !!u && u !== exampleThumb);

    // dedupe while preserving order
    const seen = new Set();
    const unique = [];
    for (const u of resolved) {
      if (!seen.has(u)) { seen.add(u); unique.push(u); }
    }

    // limit to a reasonable number to avoid rendering accidental large lists
    const candidates = unique.length ? unique.slice(0, 50) : [];

    // verify availability on the remote server (Cloudinary). Keep only valid ones.
    let final = [];
    try {
      final = await verifyUrls(candidates);
    } catch (e) {
      final = [];
    }

    if (!final.length) {
      // fallback to example thumb if nothing is available
      final = [exampleThumb];
    }

    setGalleryImages(final);
    setGalleryIndex(Math.max(0, Math.min(startIndex || 0, final.length - 1)));
    setGalleryOpen(true);
    setGalleryLoading(false);
  };

  const closeGallery = () => { setGalleryOpen(false); setGalleryImages([]); setGalleryIndex(0); };
  const gotoNext = () => setGalleryIndex(i => (galleryImages.length ? (i + 1) % galleryImages.length : 0));
  const gotoPrev = () => setGalleryIndex(i => (galleryImages.length ? (i - 1 + galleryImages.length) % galleryImages.length : 0));

  // keyboard navigation for modal
  useEffect(() => {
    if (!galleryOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeGallery();
      else if (e.key === 'ArrowRight') gotoNext();
      else if (e.key === 'ArrowLeft') gotoPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [galleryOpen, galleryImages.length]);

  // periodic refresh (conservative every 10s)
  useEffect(() => {
    const controller = new AbortController();
    const tick = async () => { await fetchAvailable(controller.signal); await loadAssignedForMe(controller.signal); };
    const id = setInterval(tick, 10000);
    return () => { clearInterval(id); controller.abort(); };
  }, [fetchAvailable, loadAssignedForMe]);

  const handleClaim = useCallback(async (chunkId) => {
    if (!workerId) { toast.error('Worker not identified — cannot claim. Please login or provide workerId.'); return; }
    if (activeAssigned) { toast.error('Please complete your current assignment before claiming another.'); return; }

    setClaimingId(chunkId);
    try {
      await claimAssignment(chunkId, workerId);
      toast.success('Claimed successfully');
      setAssignments(prev => prev.filter(p => p._id !== chunkId));
      await loadAssignedForMe();
    } catch (err) {
      console.error('claim error', err);
      if (err?.response?.status === 409) toast.error('Chunk already taken by someone else');
      else toast.error('Failed to claim chunk');
      await fetchAvailable();
      await loadAssignedForMe();
    } finally {
      if (mountedRef.current) setClaimingId(null);
    }
  }, [workerId, activeAssigned, loadAssignedForMe, fetchAvailable]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const a of assignments) {
      const orderKey = a.order?.orderId ?? String(a.order ?? a.orderId ?? 'unknown');
      const group = map.get(orderKey) ?? { orderKey, orderLabel: orderKey, design: a.order?.styleSnapshot?.name || '—', priority: normalize(a.order?.priority ?? a.priority ?? 'Normal'), deadline: a.order?.deadline ?? a.deadline ?? null, process: a.stage ?? a.process ?? 'Unknown', chunks: [] };
      group.chunks.push(a);
      map.set(orderKey, group);
    }
    return Array.from(map.values());
  }, [assignments]);

  const tableRows = useMemo(() => grouped.flatMap(g => g.chunks.map(c => ({ orderKey: g.orderKey, chunk: c }))), [grouped]);

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks {workerCategory ? `— ${workerCategory}` : ''}</h1>
          <p className="text-sm text-gray-600 mt-1">{workerLoading ? 'Determining worker type…' : (workerCategory ? `Showing tasks for ${workerCategory}` : 'Showing all tasks')}</p>
        </div>
        <div className="text-sm text-gray-600">{loading ? 'Loading…' : `${assignments.length} chunk(s) available`}</div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="text-left text-sm text-gray-600">
              <th className="px-3 py-2">Photo</th>
              <th className="px-3 py-2">SKU / Order</th>
              <th className="px-3 py-2">Pieces</th>
              <th className="px-3 py-2">Color</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Pick</th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-100">
            {activeAssigned && (
              <TaskRow
                key={activeAssigned._id}
                chunk={activeAssigned}
                orderKey={activeAssigned.order?.orderId ?? activeAssigned.order}
                status="Current"
                activeAssignedId={activeAssigned._id}
                claimingId={claimingId}
                onClaim={handleClaim}
                workerId={workerId}
                onOpenGallery={openGallery}
              />
            )}

            {tableRows.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-500">No available tasks</td>
              </tr>
            ) : tableRows.map(({ orderKey, chunk }) => (
              <TaskRow
                key={chunk._id}
                chunk={chunk}
                orderKey={orderKey}
                status="Available"
                activeAssignedId={activeAssigned?._id}
                claimingId={claimingId}
                onClaim={handleClaim}
                workerId={workerId}
                onOpenGallery={openGallery}
              />
            ))}

            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-500">Loading tasks…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
      {/* Gallery modal (simple lightbox) */}
      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
          onClick={closeGallery}
        >
          <div className="relative max-w-3xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeGallery}
              aria-label="Close"
              className="absolute top-2 right-2 text-white bg-gray-800 bg-opacity-50 rounded-full p-2"
            >
              ×
            </button>

            {galleryLoading ? (
              <div className="flex flex-col items-center justify-center p-8">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
                <div className="text-white text-sm">Loading images…</div>
              </div>
            ) : (
              <>
                <img
                  src={galleryImages[galleryIndex] || exampleThumb}
                  alt={`preview-${galleryIndex}`}
                  className="w-full max-h-[80vh] object-contain rounded"
                />

                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); gotoPrev(); }}
                      aria-label="Previous"
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white bg-gray-800 bg-opacity-50 rounded-full p-2"
                    >
                      ‹
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); gotoNext(); }}
                      aria-label="Next"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white bg-gray-800 bg-opacity-50 rounded-full p-2"
                    >
                      ›
                    </button>
                  </>
                )}

                <div className="mt-2 text-center text-sm text-white">{galleryIndex + 1} / {galleryImages.length}</div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

AvailableTasksTable.propTypes = {
  workerId: PropTypes.string,
  workerCategory: PropTypes.string
};

AvailableTasksTable.defaultProps = { workerId: undefined, workerCategory: null };

export default AvailableTasksTable;
