// src/pages/StyleManagement.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Plus,
  ImageIcon,
  Trash,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Shirt,
  Barcode,
  Ruler,
  Palette,
  Upload,
  IndianRupee,
  Calculator,
  Scissors,
  Printer,
  Wand2,
  PaintRoller,
  Package,
  Info
} from 'lucide-react';
import * as styleService from '../services/styleServices'; // <-- ensure this file exists
import PaginationControls from '../ui/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';
import { useLayout } from '../context/LayoutContext';

// Cloudinary setup: use Vite env vars
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'your_cloud_name';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'your_upload_preset';

const defaultSteps = [
  'Cutting',
  'Printing',
  'Stitching',
  'Finishing',
  'Packing'
];

const stepIcons = [Scissors, Printer, Wand2, PaintRoller, Package];

const sortStages = (stages) =>
  [...stages].sort((a, b) => {
    const orderDiff = (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);
    if (orderDiff !== 0) return orderDiff;
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });

export default function StyleManagement() {
  const { sidebarOpen, isMobile } = useLayout();
  const [styles, setStyles] = useState([]);
  const [availableStages, setAvailableStages] = useState([]);
  const [selectedStageIds, setSelectedStageIds] = useState([]);
  const [isStageManagerOpen, setIsStageManagerOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [stageSaving, setStageSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const colorRef = useRef();
  const sizeRef = useRef();
  const [photos, setPhotos] = useState([]); // { url, filename } or string URLs
  const [stepPrices, setStepPrices] = useState({});

  // gallery modal state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]); // array of urls
  const [galleryIndex, setGalleryIndex] = useState(0);
  const thumbnailsRef = useRef(null);
  const fileInputRef = useRef(null);

  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems: paginatedStyles,
    handlePageChange
  } = useClientPagination(styles, 8);

  // Utility: build absolute photo URL if needed
  const getPhotoUrl = useCallback((urlOrObj) => {
    if (!urlOrObj) return '';
    if (typeof urlOrObj === 'object' && urlOrObj.url) return urlOrObj.url;
    const val = typeof urlOrObj === 'string' ? urlOrObj : '';
    if (!val) return '';
    if (/^https?:\/\//i.test(val)) return val;
    if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'your_cloud_name') return val;

    // Only treat as a Cloudinary public_id if it looks like one (not common words/attributes)
    // Cloudinary public IDs typically contain alphanumeric chars, hyphens, underscores, and dots
    // But exclude common style attributes, process names, and short generic words
    const commonWords = /^(xl|s|m|l|xs|xxl|red|blue|green|yellow|orange|black|white|cutting|packing|printing|finishing|stitching|available|low|medium|high|normal|pending|approved|rejected|completed|in.progress|delayed)$/i;
    const looksLikePublicId = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(val) && val.length > 3 && !commonWords.test(val);

    if (looksLikePublicId) {
      return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${val}`;
    }
    return '';
  }, []);

  // fetch styles on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [styleData, stageData] = await Promise.all([
          styleService.fetchStyles(),
          styleService.fetchStages()
        ]);
        if (!mounted) return;

        const stages = stageData?.length
          ? stageData
          : defaultSteps.map((stage, index) => ({ _id: stage, name: stage, sortOrder: index + 1, active: true }));

        setStyles(styleData || []);
        const sortedStages = sortStages(stages);
        setAvailableStages(sortedStages);
        setSelectedStageIds(sortedStages.filter((stage) => stage.active !== false).map((stage) => stage._id));
      } catch (err) {
        console.error('Failed to fetch styles or stages', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const activeStages = useMemo(
    () => availableStages.filter((stage) => stage.active !== false),
    [availableStages]
  );
  const selectedStages = useMemo(
    () => selectedStageIds
      .map((stageId) => activeStages.find((stage) => stage._id === stageId))
      .filter(Boolean),
    [activeStages, selectedStageIds]
  );
  const orderedStyleStages = useMemo(
    () => [
      ...selectedStages,
      ...activeStages.filter((stage) => !selectedStageIds.includes(stage._id))
    ],
    [activeStages, selectedStageIds, selectedStages]
  );

  const resetForm = useCallback(() => {
    setName('');
    setSku('');
    setSizes([]);
    setColors([]);
    setPhotos([]);
    setStepPrices({});
    setSelectedStageIds(activeStages.map((stage) => stage._id));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [activeStages]);

  const uploadFilesToCloudinary = useCallback(async (files) => {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      alert('Please configure Cloudinary credentials in .env (VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET)');
      return [];
    }

    setUploading(true);
    const uploaded = [];
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        // Cloudinary-side compression (no backend upload in this app)
        fd.append('transformation', 'f_auto,q_auto:eco');

        try {
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: fd,
          });
          const data = await res.json();
          if (!res.ok) {
            console.error('Cloudinary upload failed', data);
            continue;
          }
          const url = data.secure_url || data.url || (data.public_id ? getPhotoUrl(data.public_id) : null);
          if (url) uploaded.push({ url, filename: file.name });
        } catch (err) {
          console.error('Upload error', err);
        }
      }
    } finally {
      setUploading(false);
    }
    return uploaded;
  }, [getPhotoUrl]);

  const handlePhotoInput = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newUploaded = await uploadFilesToCloudinary(files);
    setPhotos(prev => [...prev, ...newUploaded]);
    // clear file input for next selection
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadFilesToCloudinary]);

  const removePhoto = useCallback((index) => {
    setPhotos(p => p.filter((_, i) => i !== index));
  }, []);

  const addColor = useCallback(() => {
    const val = colorRef.current?.value?.trim();
    if (!val) return;
    if (colors.includes(val)) {
      colorRef.current.value = '';
      return;
    }
    setColors(c => [...c, val]);
    colorRef.current.value = '';
  }, [colors]);

  const removeColor = useCallback((index) => {
    setColors(c => c.filter((_, i) => i !== index));
  }, []);

  const addSize = useCallback(() => {
    const raw = sizeRef.current?.value || '';
    const parts = raw
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
    if (!parts.length) return;

    setSizes(prev => {
      const next = [...prev];
      parts.forEach(p => {
        if (!next.includes(p)) next.push(p);
      });
      return next;
    });
    if (sizeRef.current) sizeRef.current.value = '';
  }, []);

  const removeSize = useCallback((index) => {
    setSizes(s => s.filter((_, i) => i !== index));
  }, []);

  const updateStepPrice = useCallback((stageId, value) => {
    setStepPrices((prev) => ({ ...prev, [stageId]: value }));
  }, []);

  const toggleStyleStage = useCallback((stageId) => {
    setSelectedStageIds((prev) => {
      if (prev.includes(stageId)) {
        return prev.filter((id) => id !== stageId);
      }
      return [...prev, stageId];
    });
  }, []);

  const moveStyleStage = useCallback((stageId, direction) => {
    setSelectedStageIds((prev) => {
      const currentIndex = prev.indexOf(stageId);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= prev.length) return prev;

      const next = [...prev];
      [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
      return next;
    });
  }, []);

  const createNewStage = useCallback(async () => {
    const name = newStageName.trim();
    if (!name) return;

    setStageSaving(true);
    try {
      const created = await styleService.createStage({ name });
      setAvailableStages((prev) => sortStages([...prev, created]));
      setSelectedStageIds((prev) => [...prev, created._id]);
      setNewStageName('');
    } catch (err) {
      console.error('Failed to create stage', err);
      alert(err?.response?.data?.message || 'Failed to create stage');
    } finally {
      setStageSaving(false);
    }
  }, [newStageName]);

  const deleteStage = useCallback(async (stage) => {
    if (!window.confirm(`Delete stage "${stage.name}"?`)) return;

    try {
      await styleService.deleteStage(stage._id);
      setAvailableStages((prev) => prev.filter((item) => item._id !== stage._id));
      setSelectedStageIds((prev) => prev.filter((id) => id !== stage._id));
      setStepPrices((prev) => {
        const next = { ...prev };
        delete next[stage._id];
        return next;
      });
    } catch (err) {
      console.error('Failed to delete stage', err);
      alert(err?.response?.data?.message || 'Failed to delete stage');
    }
  }, []);

  const moveStage = useCallback(async (stageId, direction) => {
    const sortedStages = sortStages(availableStages);
    const currentIndex = sortedStages.findIndex((stage) => stage._id === stageId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedStages.length) return;

    const currentStage = sortedStages[currentIndex];
    const targetStage = sortedStages[targetIndex];
    const currentOrder = Number(currentStage.sortOrder) || currentIndex + 1;
    const targetOrder = Number(targetStage.sortOrder) || targetIndex + 1;

    try {
      const [updatedCurrent, updatedTarget] = await Promise.all([
        styleService.updateStage(currentStage._id, { sortOrder: targetOrder }),
        styleService.updateStage(targetStage._id, { sortOrder: currentOrder })
      ]);

      setAvailableStages((prev) => sortStages(prev.map((stage) => {
        if (stage._id === updatedCurrent._id) return updatedCurrent;
        if (stage._id === updatedTarget._id) return updatedTarget;
        return stage;
      })));
    } catch (err) {
      console.error('Failed to switch stage order', err);
      alert(err?.response?.data?.message || 'Failed to switch stage order');
    }
  }, [availableStages]);

  const saveStyle = useCallback(async () => {
    if (!name.trim() || !sku.trim()) return alert('Name and SKU required');

    const photoUrls = photos.map(p => (typeof p === 'string' ? p : p.url));

    if (selectedStages.length === 0) return alert('Select at least one stage');

    const payload = {
      name,
      skuId: sku,
      photos: photoUrls,
      sizes,
      colors,
      steps: selectedStages.map((stage) => ({
        stageId: stage._id,
        label: stage.name,
        price: Number(stepPrices[stage._id] || 0)
      })),
    };

    try {
      const created = await styleService.createStyle(payload);
      // ensure created item exists and has _id
      setStyles(prev => [created, ...prev]);
      setIsOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to save style', err);
      alert(err?.response?.data?.message || 'Save failed');
    }
  }, [name, sku, sizes, photos, colors, selectedStages, stepPrices, resetForm]);

  const deleteStyle = useCallback(async (id) => {
    if (!window.confirm('Delete this style?')) return;
    try {
      await styleService.deleteStyle(id);
      setStyles(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      console.error('Delete failed', err);
      alert('Delete failed');
    }
  }, []);

  // ---------- Gallery modal helpers ----------
  // scroll the thumbnails container so active thumb is visible
  const scrollThumbIntoView = useCallback((index) => {
    const container = thumbnailsRef.current;
    if (!container) return;
    const thumb = container.querySelector(`[data-thumb-index="${index}"]`);
    if (!thumb) return;
    // center the thumbnail in the container if possible
    const containerRect = container.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const offset = thumbRect.left - containerRect.left - (containerRect.width / 2) + (thumbRect.width / 2);
    container.scrollBy({ left: offset, behavior: 'smooth' });
  }, []);

  // open gallery with given array of urls and start index
  const openGallery = useCallback((urls = [], startIndex = 0) => {
    const normalized = (urls || []).map(u => getPhotoUrl(u)).filter(Boolean);
    if (!normalized.length) return;
    const idx = Math.min(Math.max(0, startIndex), normalized.length - 1);
    setGalleryImages(normalized);
    setGalleryIndex(idx);
    setGalleryOpen(true);
    // small timeout to allow DOM to render before scrolling thumbnail into view
    setTimeout(() => scrollThumbIntoView(idx), 50);
  }, [getPhotoUrl, scrollThumbIntoView]);

  const closeGallery = useCallback(() => {
    setGalleryOpen(false);
    setGalleryImages([]);
    setGalleryIndex(0);
  }, []);

  const nextImage = useCallback(() => {
    setGalleryIndex(i => {
      if (!galleryImages.length) return 0;
      const ni = (i + 1) % galleryImages.length;
      scrollThumbIntoView(ni);
      return ni;
    });
  }, [galleryImages.length, scrollThumbIntoView]);

  const prevImage = useCallback(() => {
    setGalleryIndex(i => {
      if (!galleryImages.length) return 0;
      const ni = (i - 1 + galleryImages.length) % galleryImages.length;
      scrollThumbIntoView(ni);
      return ni;
    });
  }, [galleryImages.length, scrollThumbIntoView]);

  // keyboard navigation when gallery is open
  useEffect(() => {
    if (!galleryOpen) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') closeGallery();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [galleryOpen, nextImage, prevImage, closeGallery]);

  // ---------- render ----------
  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Style Management</h1>
          <p className="text-sm text-gray-500">Create and manage style definitions and per-step pricing.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setIsStageManagerOpen(true)}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-50"
          >
            <Plus size={16} /> Create Stage
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600"
          >
            <Plus size={16} /> Create new Style
          </button>
        </div>
      </header>

      <div className="bg-white rounded-lg shadow border overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 sm:p-4 text-left text-xs sm:text-sm">Name</th>
              <th className="p-2 sm:p-4 text-left text-xs sm:text-sm">SKU</th>
              <th className="p-2 sm:p-4 text-left text-xs sm:text-sm hidden sm:table-cell">Sizes</th>
              <th className="p-2 sm:p-4 text-left text-xs sm:text-sm hidden md:table-cell">Colors</th>
              <th className="p-2 sm:p-4 text-left text-xs sm:text-sm">Photos</th>
              <th className="p-2 sm:p-4 text-left text-xs sm:text-sm hidden lg:table-cell">Steps / Prices</th>
              <th className="p-2 sm:p-4 text-right text-xs sm:text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {styles.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  No styles yet — click Create new Style to add one.
                </td>
              </tr>
            )}

            {paginatedStyles.map(style => {
              const stylePhotos = style.photos || [];
              const visible = stylePhotos.slice(0, 2); // show only first 2 inline
              const extraCount = Math.max(0, stylePhotos.length - visible.length);

              return (
                <tr key={style._id} className="border-t">
                  <td className="p-2 sm:p-4 align-top text-sm">{style.name}</td>
                  <td className="p-2 sm:p-4 align-top text-sm">{style.skuId}</td>
                  <td className="p-2 sm:p-4 align-top text-sm hidden sm:table-cell">{(style.sizes || []).join(', ')}</td>
                  <td className="p-2 sm:p-4 align-top text-sm hidden md:table-cell">{(style.colors || []).join(', ')}</td>

                  <td className="p-2 sm:p-4 align-top">
                    <div className="flex items-center gap-1 sm:gap-2">
                      {visible
                        .map((p, i) => ({ photo: p, index: i, url: getPhotoUrl(p) }))
                        .filter(({ url }) => url) // Only show photos with valid URLs
                        .map(({ index, url }) => (
                          <img
                            key={index}
                            src={url}
                            alt={`photo-${index}`}
                            className="h-8 w-8 sm:h-12 sm:w-12 object-cover rounded cursor-pointer"
                            onClick={() => openGallery(stylePhotos, index)}
                          />
                        ))}

                      {/* If there are more than 2 photos, show +N button */}
                      {extraCount > 0 && (
                        <button
                          type="button"
                          onClick={() => openGallery(stylePhotos, visible.length)} // open gallery starting at the 3rd image
                          className="h-8 w-8 sm:h-12 sm:w-12 flex items-center justify-center rounded bg-black/10 text-xs sm:text-sm font-medium cursor-pointer border"
                          title={`Show ${stylePhotos.length} images`}
                        >
                          +{extraCount}
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="p-2 sm:p-4 align-top hidden lg:table-cell">
                    <div className="space-y-1">
                      {(style.steps || []).map((s, i) => (
                        <div key={i} className="text-xs sm:text-sm">
                          <strong>{s.label}:</strong> ₹{s.price}
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="p-2 sm:p-4 align-top text-right">
                    <button
                      onClick={() => deleteStyle(style._id)}
                      className="px-2 sm:px-3 py-1 border rounded text-red-600 hover:bg-red-50 text-xs sm:text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}

          </tbody>
        </table>
      </div>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        itemLabel="styles"
      />

      {/* create style modal */}
      {isOpen && (
        <div className={`fixed inset-0 z-40 flex items-start justify-center p-3 sm:p-5 lg:p-6 ${sidebarOpen && !isMobile ? 'lg:left-64' : ''}`}>
          <div className="absolute inset-0 cursor-pointer bg-black/40" onClick={() => setIsOpen(false)} />
          <div
            className="relative z-50 max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="max-h-[92vh] overflow-auto p-4 sm:p-6 lg:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 sm:h-16 sm:w-16">
                    <Shirt className="h-7 w-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">Create New Style</h2>
                    <p className="mt-1 text-sm text-slate-500">Upload photos, set sizes, colors and per-step pricing.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Close create style modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-6 min-[920px]:grid-cols-[minmax(0,1fr)_minmax(300px,0.92fr)]">
                <section>
                  <div className="pb-2">
                    <h3 className="inline-block border-b-2 border-violet-600 pb-2 text-sm font-semibold text-violet-600">Style Details</h3>
                  </div>

                  <div className="mt-3 space-y-4">
                    <label className="flex items-end gap-3">
                      <div className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <Shirt className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-slate-700">Style Name</span>
                        <input
                          value={name}
                          onChange={e => setName(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          placeholder="e.g. Casual Tee"
                        />
                      </div>
                    </label>

                    <label className="flex items-end gap-3">
                      <div className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <Barcode className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-slate-700">SKU</span>
                        <input
                          value={sku}
                          onChange={e => setSku(e.target.value)}
                          className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                          placeholder="unique-sku-001"
                        />
                      </div>
                    </label>

                    <div className="flex items-start gap-3">
                      <div className="mt-6 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <Ruler className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-slate-700">Sizes</span>
                        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                          <input
                            ref={sizeRef}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            placeholder="Add sizes (comma-separated), e.g. S, M, L, 28"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addSize();
                              }
                            }}
                          />
                          <button type="button" onClick={addSize} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Add</button>
                        </div>
                        {sizes.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {sizes.map((s, i) => (
                              <div key={`${s}-${i}`} className="flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs text-violet-700">
                                <span>{s}</span>
                                <button type="button" onClick={() => removeSize(i)} className="text-violet-500 hover:text-violet-900"><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-6 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <Palette className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-slate-700">Colors</span>
                        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                          <input
                            ref={colorRef}
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                            placeholder="Add color name e.g. Navy"
                          />
                          <button type="button" onClick={addColor} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Add</button>
                        </div>
                        {colors.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {colors.map((c, i) => (
                              <div key={i} className="flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs text-violet-700">
                                <span>{c}</span>
                                <button type="button" onClick={() => removeColor(i)} className="text-violet-500 hover:text-violet-900"><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-6 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-slate-700">Photos</span>
                        <label className="mt-2 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center hover:border-violet-300 hover:bg-violet-50/40">
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                            <Upload className="h-5 w-5" />
                          </span>
                          <span className="mt-3 text-sm font-semibold text-slate-900">Upload photos (multiple)</span>
                          <span className="mt-1 text-xs text-slate-500">Drag & drop files here or click to browse</span>
                          <span className="mt-1 text-xs text-slate-400">JPG, PNG up to 10MB each</span>
                          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoInput} className="hidden" />
                        </label>

                        {uploading && <div className="mt-2 text-sm text-slate-500">Uploading images...</div>}

                        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {photos
                            .map((p, i) => ({ photo: p, index: i, url: getPhotoUrl(p) }))
                            .filter(({ url }) => url)
                            .map(({ photo, index, url }) => (
                              <div key={index} className="group relative">
                                <img src={url} alt={photo.filename || `photo-${index}`} className="h-24 w-full cursor-pointer rounded-lg object-cover" onClick={() => openGallery(photos, index)} />
                                <button type="button" onClick={() => removePhoto(index)} className="absolute right-1 top-1 rounded-full bg-white p-1 text-red-500 opacity-0 shadow group-hover:opacity-100"><Trash size={14} /></button>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="border-t border-slate-200 pt-5 min-[920px]:border-l min-[920px]:border-t-0 min-[920px]:pl-6 min-[920px]:pt-0">
                  <div className="flex items-center justify-between gap-3 border-b border-violet-100 pb-2">
                    <h3 className="text-sm font-semibold text-violet-600">Steps & Prices</h3>
                    <button type="button" onClick={() => setIsStageManagerOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-600 hover:bg-violet-50">
                      <Plus className="h-4 w-4" />
                      Manage Stages
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {activeStages.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                        <p className="text-sm font-semibold text-slate-800">No active stages available</p>
                        <button
                          type="button"
                          onClick={() => setIsStageManagerOpen(true)}
                          className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                        >
                          <Plus className="h-4 w-4" />
                          Create Stage
                        </button>
                      </div>
                    )}
                    {orderedStyleStages.map((stage) => {
                      const idx = selectedStageIds.indexOf(stage._id);
                      const selected = idx !== -1;
                      const StepIcon = stepIcons[activeStages.findIndex((item) => item._id === stage._id)] || Shirt;
                      return (
                        <div key={stage._id} className={`grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border p-3 shadow-sm sm:grid-cols-[auto_auto_minmax(0,1fr)_minmax(112px,144px)] sm:items-center ${selected ? 'border-violet-200 bg-white' : 'border-slate-200 bg-slate-50/70'}`}>
                          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white sm:inline-flex">
                            <button
                              type="button"
                              onClick={() => moveStyleStage(stage._id, 'up')}
                              disabled={!selected || idx === 0}
                              className="inline-flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                              aria-label={`Move ${stage.name} up for this style`}
                              title="Move up for this style"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStyleStage(stage._id, 'down')}
                              disabled={!selected || idx === selectedStageIds.length - 1}
                              className="inline-flex h-8 w-8 items-center justify-center border-l border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                              aria-label={`Move ${stage.name} down for this style`}
                              title="Move down for this style"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                            <StepIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <label className="flex min-w-0 items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleStyleStage(stage._id)}
                                className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                              />
                              <span className="truncate text-sm font-medium text-slate-900">{stage.name}</span>
                            </label>
                            <div className="mt-2 inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white sm:hidden">
                              <button
                                type="button"
                                onClick={() => moveStyleStage(stage._id, 'up')}
                                disabled={!selected || idx === 0}
                                className="inline-flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                                aria-label={`Move ${stage.name} up for this style`}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveStyleStage(stage._id, 'down')}
                                disabled={!selected || idx === selectedStageIds.length - 1}
                                className="inline-flex h-8 w-8 items-center justify-center border-l border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                                aria-label={`Move ${stage.name} down for this style`}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="relative col-span-2 w-full sm:col-span-1">
                            <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <input
                              type="number"
                              min="0"
                              value={selected ? stepPrices[stage._id] || '' : ''}
                              onChange={e => updateStepPrice(stage._id, e.target.value)}
                              disabled={!selected}
                              placeholder="amount"
                              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-xl border border-violet-100 bg-violet-50/50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                        <Calculator className="h-5 w-5" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">Preview total price</h4>
                    </div>
                    <div className="text-3xl font-bold text-slate-950">
                      ₹{selectedStages.reduce((acc, stage) => acc + Number(stepPrices[stage._id] || 0), 0)}
                    </div>
                  </div>
                </section>
              </div>

              <div className="sticky bottom-0 -mx-4 mt-6 flex flex-col gap-4 border-t border-slate-100 bg-white/95 px-4 py-4 shadow-[0_-8px_20px_rgba(15,23,42,0.04)] backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:-mx-7 lg:px-7">
                <div className="flex items-start gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-600">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Create stages once, then select the needed stages and enter style-specific amounts.</span>
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button type="button" onClick={() => { resetForm(); setIsOpen(false); }} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button type="button" onClick={saveStyle} className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700">Save</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isStageManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full overflow-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Stage Management</h2>
                <p className="mt-1 text-sm text-slate-500">Create reusable production stages. Styles can select these stages and set their own amount.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsStageManagerOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Close stage manager"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    createNewStage();
                  }
                }}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                placeholder="Stage name, e.g. Embroidery"
              />
              <button
                type="button"
                onClick={createNewStage}
                disabled={stageSaving || !newStageName.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {stageSaving ? 'Adding...' : 'Create Stage'}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {availableStages.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No stages created yet.
                </div>
              )}
              {availableStages.map((stage, stageIndex) => (
                <div key={stage._id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-violet-600 shadow-sm">
                      {stageIndex + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="break-words text-sm font-semibold text-slate-900">{stage.name}</div>
                      <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${stage.active === false ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                        {stage.active === false ? 'Inactive' : 'Active'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:ml-auto sm:justify-end">
                    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <button
                        type="button"
                        onClick={() => moveStage(stage._id, 'up')}
                        disabled={stageIndex === 0}
                        className="inline-flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                        aria-label={`Move ${stage.name} up`}
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStage(stage._id, 'down')}
                        disabled={stageIndex === availableStages.length - 1}
                        className="inline-flex h-8 w-8 items-center justify-center border-l border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                        aria-label={`Move ${stage.name} down`}
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const updated = await styleService.updateStage(stage._id, { active: stage.active === false });
                          setAvailableStages((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
                          if (updated.active === false) {
                            setSelectedStageIds((prev) => prev.filter((id) => id !== updated._id));
                          }
                        } catch (err) {
                          console.error('Failed to update stage', err);
                          alert(err?.response?.data?.message || 'Failed to update stage');
                        }
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${stage.active === false ? 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
                    >
                      {stage.active === false ? 'Enable' : 'Disable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStage(stage)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Gallery Modal (full-screen) ---------- */}
      {galleryOpen && galleryImages.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          {/* backdrop click closes */}
          <div className="absolute inset-0 cursor-pointer" onClick={closeGallery} />

          <div className="relative max-w-5xl w-full mx-auto z-60">
            {/* close button */}
            <button onClick={closeGallery} className="absolute top-3 right-3 z-10 bg-white rounded-full p-2 shadow">
              <X />
            </button>

            {/* main image area */}
            <div className="relative bg-black rounded-md overflow-hidden">
              {/* left arrow */}
              <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 rounded-full p-2 shadow">
                <ChevronLeft />
              </button>

              {/* right arrow */}
              <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 rounded-full p-2 shadow">
                <ChevronRight />
              </button>

              <div className="flex items-center justify-center min-h-[400px] max-h-[80vh]">
                <img src={galleryImages[galleryIndex]} alt={`gallery-${galleryIndex}`} className="max-h-[80vh] max-w-full object-contain" />
              </div>
            </div>

            {/* thumbnails strip */}
            <div className="mt-3">
              <div ref={thumbnailsRef} className="flex gap-2 overflow-x-auto py-2 px-1">
                {galleryImages.map((url, i) => (
                  <button
                    key={i}
                    data-thumb-index={i}
                    onClick={() => { setGalleryIndex(i); scrollThumbIntoView(i); }}
                    className={`flex-shrink-0 rounded overflow-hidden border ${i === galleryIndex ? 'ring-2 ring-emerald-400' : 'border-gray-200'}`}
                    style={{ width: 96, height: 64 }}
                  >
                    <img src={url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
