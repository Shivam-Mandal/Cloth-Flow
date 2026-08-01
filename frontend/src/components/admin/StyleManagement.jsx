// src/pages/StyleManagement.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Plus,
  ImageIcon,
  Trash,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Columns3,
  Download,
  MoreHorizontal,
  Pencil,
  Eye,
  EllipsisVertical,
  AlertCircle,
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
import api from '../../api/api';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';

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

const colorMap = {
  black: '#111827',
  blue: '#2563eb',
  brown: '#92400e',
  gray: '#6b7280',
  green: '#16a34a',
  grey: '#6b7280',
  orange: '#f97316',
  pink: '#ec4899',
  purple: '#7c3aed',
  red: '#dc2626',
  white: '#ffffff',
  yellow: '#eab308',
};

const getColorValue = (color = '') => {
  const normalized = String(color).trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) return normalized;
  return colorMap[normalized] || '#8b5cf6';
};

const getTotalCost = (style = {}) =>
  (style.steps || []).reduce((total, step) => total + Number(step.price || 0), 0);

const getStyleStatus = (style = {}) => style.status || (style.active === false ? 'Inactive' : 'Active');

export default function StyleManagement() {
  const { sidebarOpen, isMobile } = useLayout();
  const [styles, setStyles] = useState([]);
  const [availableStages, setAvailableStages] = useState([]);
  const [selectedStageIds, setSelectedStageIds] = useState([]);
  const [isStageManagerOpen, setIsStageManagerOpen] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [stageSaving, setStageSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState(null);
  const [detailsStyle, setDetailsStyle] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);
  const [loadingStyles, setLoadingStyles] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [colorFilter, setColorFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState(null);

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

  const sizeOptions = useMemo(
    () => [...new Set(styles.flatMap((style) => style.sizes || []).filter(Boolean))],
    [styles]
  );
  const colorOptions = useMemo(
    () => [...new Set(styles.flatMap((style) => style.colors || []).filter(Boolean))],
    [styles]
  );
  const stageOptions = useMemo(
    () => [...new Set(styles.flatMap((style) => (style.steps || []).map((step) => step.label)).filter(Boolean))],
    [styles]
  );
  const statusOptions = useMemo(
    () => [...new Set(styles.map((style) => getStyleStatus(style)).filter(Boolean))],
    [styles]
  );
  const filteredStyles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = styles.filter((style) => {
      const haystack = [
        style.name,
        style.skuId,
        ...(style.sizes || []),
        ...(style.colors || []),
        ...(style.steps || []).map((step) => step.label)
      ].join(' ').toLowerCase();

      return (
        (!query || haystack.includes(query)) &&
        (sizeFilter === 'all' || (style.sizes || []).includes(sizeFilter)) &&
        (colorFilter === 'all' || (style.colors || []).includes(colorFilter)) &&
        (stageFilter === 'all' || (style.steps || []).some((step) => step.label === stageFilter)) &&
        (statusFilter === 'all' || getStyleStatus(style) === statusFilter)
      );
    });

    return [...matches].sort((a, b) => {
      if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      if (sortBy === 'sku') return String(a.skuId || '').localeCompare(String(b.skuId || ''));
      if (sortBy === 'cost') return getTotalCost(b) - getTotalCost(a);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [colorFilter, searchQuery, sizeFilter, sortBy, stageFilter, statusFilter, styles]);

  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems: paginatedStyles,
    handlePageChange
  } = useClientPagination(filteredStyles, 8);

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
      setLoadingStyles(true);
      setLoadError('');
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
        if (mounted) setLoadError(err?.response?.data?.message || 'Failed to load styles.');
      } finally {
        if (mounted) setLoadingStyles(false);
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

  const closeStyleModal = useCallback(() => {
    resetForm();
    setEditingStyle(null);
    setIsOpen(false);
  }, [resetForm]);

  const openCreateStyle = useCallback(() => {
    resetForm();
    setEditingStyle(null);
    setIsOpen(true);
  }, [resetForm]);

  const openEditStyle = useCallback((style) => {
    const styleSteps = style.steps || [];
    const stageIds = styleSteps
      .map((step) => {
        const rawId = step.stageId?._id || step.stageId;
        const id = rawId ? String(rawId) : '';
        const matchingStage = availableStages.find((stage) => String(stage._id) === id || stage.name === step.label);
        return matchingStage?._id;
      })
      .filter(Boolean);
    const prices = {};

    styleSteps.forEach((step) => {
      const rawId = step.stageId?._id || step.stageId;
      const id = rawId ? String(rawId) : '';
      const matchingStage = availableStages.find((stage) => String(stage._id) === id || stage.name === step.label);
      if (matchingStage?._id) prices[matchingStage._id] = step.price ?? 0;
    });

    setEditingStyle(style);
    setName(style.name || '');
    setSku(style.skuId || '');
    setSizes(style.sizes || []);
    setColors(style.colors || []);
    setPhotos((style.photos || []).map((url) => ({ url, filename: String(url).split('/').pop() || 'style-photo' })));
    setSelectedStageIds(stageIds.length ? stageIds : activeStages.map((stage) => stage._id));
    setStepPrices(prices);
    setOpenActionMenu(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsOpen(true);
  }, [activeStages, availableStages]);

  const uploadFilesToCloudinary = useCallback(async (files) => {
    setUploading(true);
    const uploaded = [];
    try {
      const signatureRes = await api.post('/uploads/cloudinary/signature', {
        files: Array.from(files).map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size
        }))
      });
      const uploadConfig = signatureRes.data?.data || {};
      if (!uploadConfig.cloudName || !uploadConfig.apiKey || !uploadConfig.signature || !uploadConfig.timestamp) {
        alert('Unable to prepare secure upload. Please contact an admin.');
        return [];
      }

      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('api_key', uploadConfig.apiKey);
        fd.append('timestamp', uploadConfig.timestamp);
        fd.append('signature', uploadConfig.signature);
        fd.append('folder', uploadConfig.folder);

        try {
          const res = await fetch(`https://api.cloudinary.com/v1_1/${uploadConfig.cloudName}/image/upload`, {
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

    setSavingStyle(true);
    try {
      if (editingStyle?._id) {
        const updated = await styleService.updateStyle(editingStyle._id, payload);
        setStyles(prev => prev.map((style) => (style._id === updated._id ? updated : style)));
      } else {
        const created = await styleService.createStyle(payload);
        // ensure created item exists and has _id
        setStyles(prev => [created, ...prev]);
      }
      setIsOpen(false);
      setEditingStyle(null);
      resetForm();
    } catch (err) {
      console.error('Failed to save style', err);
      alert(err?.response?.data?.message || 'Save failed');
    } finally {
      setSavingStyle(false);
    }
  }, [colors, editingStyle, name, photos, resetForm, selectedStages, sizes, sku, stepPrices]);

  const deleteStyle = useCallback(async (id) => {
    if (!window.confirm('Delete this style?')) return;
    try {
      await styleService.deleteStyle(id);
      setStyles(prev => prev.filter(s => s._id !== id));
      setOpenActionMenu(null);
      setActionMenuPosition(null);
    } catch (err) {
      console.error('Delete failed', err);
      alert('Delete failed');
    }
  }, []);

  const exportStyles = useCallback(() => {
    const headers = ['Style', 'SKU', 'Sizes', 'Colors', 'Stages', 'Total Cost', 'Status'];
    const rows = filteredStyles.map((style) => [
      style.name || '',
      style.skuId || '',
      (style.sizes || []).join(', '),
      (style.colors || []).join(', '),
      (style.steps || []).map((step) => step.label).join(', '),
      getTotalCost(style),
      getStyleStatus(style)
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'styles.csv';
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredStyles]);

  const renderImage = (style, sizeClass = 'h-12 w-12') => {
    const photoUrl = getPhotoUrl((style.photos || [])[0]);
    if (!photoUrl) {
      return (
        <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-400`}>
          <ImageIcon className="h-5 w-5" />
        </div>
      );
    }

    return (
      <img
        src={photoUrl}
        alt={style.name ? `${style.name} preview` : 'Style preview'}
        onClick={() => openGallery(style.photos || [], 0)}
        className={`${sizeClass} shrink-0 cursor-pointer rounded-md border border-slate-200 object-cover`}
      />
    );
  };

  const renderSizeChips = (style, compact = false) => {
    const values = style.sizes || [];
    if (!values.length) return <span className="text-xs text-slate-400">No sizes</span>;

    return (
      <div className="flex flex-wrap gap-1.5">
        {values.map((sizeValue, index) => (
          <span
            key={`${style._id}-size-${sizeValue}-${index}`}
            title={sizeValue}
            className={`${compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} max-w-16 truncate rounded-md border border-violet-200 bg-violet-50 font-semibold text-violet-700`}
          >
            {sizeValue}
          </span>
        ))}
      </div>
    );
  };

  const renderColor = (style) => {
    const color = (style.colors || [])[0];
    if (!color) return <span className="text-xs text-slate-400">No color</span>;

    return (
      <div className="flex min-w-0 items-center gap-2" title={(style.colors || []).join(', ')}>
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full border border-slate-300"
          style={{ backgroundColor: getColorValue(color) }}
        />
        <span className="truncate text-sm text-slate-700">{color}</span>
        {(style.colors || []).length > 1 && (
          <span className="shrink-0 text-xs font-medium text-slate-400">+{style.colors.length - 1}</span>
        )}
      </div>
    );
  };

  const renderStages = (style) => {
    const steps = style.steps || [];
    const names = steps.map((step) => step.label).filter(Boolean);
    const visibleNames = names.slice(0, 2);
    const remaining = Math.max(0, names.length - visibleNames.length);

    if (!names.length) return <span className="text-xs text-slate-400">No stages</span>;

    return (
      <div className="min-w-0" title={names.join(', ')}>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          <Scissors className="h-4 w-4 text-violet-600" />
          <span>{names.length} {names.length === 1 ? 'Stage' : 'Stages'}</span>
        </div>
        <div className="mt-1 truncate text-xs text-slate-500">
          {visibleNames.join(', ')}
          {remaining > 0 ? ` +${remaining} more` : ''}
        </div>
      </div>
    );
  };

  const renderStatus = (style) => {
    const status = getStyleStatus(style);
    const active = status.toLowerCase() === 'active';
    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
        {status}
      </span>
    );
  };

  const renderActions = (style) => {
    const actionMenuId = style._id || style.id;
    const openMenu = (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const menuWidth = 176;
      const menuHeight = 98;
      const gap = 8;
      const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
      const shouldOpenAbove = window.innerHeight - rect.bottom < menuHeight + gap;
      const top = shouldOpenAbove
        ? Math.max(8, rect.top - menuHeight - gap)
        : Math.min(rect.bottom + gap, window.innerHeight - menuHeight - 8);

      setActionMenuPosition({ left, top });
      setOpenActionMenu((current) => (current === actionMenuId ? null : actionMenuId));
    };

    return (
      <div className="relative flex items-center justify-end gap-2" data-style-action-menu>
        <button
          type="button"
          onClick={() => openEditStyle(style)}
          aria-label={`Edit ${style.name || 'style'}`}
          title="Edit style"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-600 outline-none hover:bg-violet-50 hover:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={openMenu}
          aria-label={`More actions for ${style.name || 'style'}`}
          aria-expanded={openActionMenu === actionMenuId}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-600 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <EllipsisVertical className="h-4 w-4" />
        </button>
        {openActionMenu === actionMenuId && (
          <div
            className="fixed z-50 w-44 rounded-md border border-slate-200 bg-white p-1 shadow-lg"
            style={{
              left: `${actionMenuPosition?.left ?? 0}px`,
              top: `${actionMenuPosition?.top ?? 0}px`
            }}
          >
            <button
              type="button"
              onClick={() => {
                setDetailsStyle(style);
                setOpenActionMenu(null);
                setActionMenuPosition(null);
              }}
              className="flex min-h-11 w-full items-center gap-2 rounded px-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              <Eye className="h-4 w-4" />
              View Details
            </button>
            <button
              type="button"
              onClick={() => deleteStyle(style._id)}
              className="flex min-h-11 w-full items-center gap-2 rounded px-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <Trash className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}
      </div>
    );
  };

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

  useEffect(() => {
    if (!openActionMenu) return;

    const closeMenu = (event) => {
      if (event.target.closest('[data-style-action-menu]')) return;
      setOpenActionMenu(null);
      setActionMenuPosition(null);
    };

    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, [openActionMenu]);

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
            onClick={openCreateStyle}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600"
          >
            <Plus size={16} /> Create new Style
          </button>
        </div>
      </header>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-3 sm:p-4">
          <div className="hidden flex-wrap items-center gap-3 md:flex">
            <label className="relative min-w-64 flex-1 lg:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by style name or SKU..."
                className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <select value={sizeFilter} onChange={(event) => setSizeFilter(event.target.value)} className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
              <option value="all">Size</option>
              {sizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={colorFilter} onChange={(event) => setColorFilter(event.target.value)} className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
              <option value="all">Color</option>
              {colorOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
              <option value="all">Stage</option>
              {stageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100">
              <option value="all">Status</option>
              {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <label className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100">
              <ArrowUpDown className="h-4 w-4" />
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="bg-transparent text-sm outline-none">
                <option value="newest">Sort By</option>
                <option value="name">Name</option>
                <option value="sku">SKU</option>
                <option value="cost">Cost</option>
              </select>
            </label>
            <button type="button" disabled title="Column visibility is not supported yet" className="ml-auto hidden h-11 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-400 disabled:cursor-not-allowed lg:inline-flex">
              <Columns3 className="h-4 w-4" />
              Columns
            </button>
            <button type="button" onClick={exportStyles} className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          <div className="space-y-3 md:hidden">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by style name or SKU..."
                className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <details className="relative">
                <summary className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-2 text-sm font-semibold text-slate-700">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </summary>
                <div className="absolute left-0 top-12 z-20 w-[min(88vw,280px)] space-y-2 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
                  <select value={sizeFilter} onChange={(event) => setSizeFilter(event.target.value)} className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm"><option value="all">Size</option>{sizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                  <select value={colorFilter} onChange={(event) => setColorFilter(event.target.value)} className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm"><option value="all">Color</option>{colorOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                  <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)} className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm"><option value="all">Stage</option>{stageOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm"><option value="all">Status</option>{statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                </div>
              </details>
              <label className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-2 text-sm font-semibold text-slate-700">
                <ArrowUpDown className="h-4 w-4" />
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="w-12 bg-transparent text-sm outline-none">
                  <option value="newest">Sort</option>
                  <option value="name">Name</option>
                  <option value="sku">SKU</option>
                  <option value="cost">Cost</option>
                </select>
              </label>
              <button type="button" onClick={exportStyles} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-2 text-sm font-semibold text-slate-700">
                <MoreHorizontal className="h-4 w-4" />
                More
              </button>
            </div>
          </div>
        </div>

        {loadingStyles && (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid animate-pulse grid-cols-[56px_minmax(0,1fr)_96px] gap-3 rounded-md border border-slate-100 p-3 lg:grid-cols-[minmax(220px,1.7fr)_minmax(120px,0.8fr)_minmax(150px,1fr)_minmax(120px,0.8fr)_minmax(170px,1fr)_110px_100px_100px]">
                <div className="h-12 w-12 rounded-md bg-slate-100" />
                <div className="space-y-2"><div className="h-4 w-3/4 rounded bg-slate-100" /><div className="h-3 w-1/2 rounded bg-slate-100" /></div>
                <div className="h-8 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {!loadingStyles && loadError && (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-slate-500">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="font-semibold text-slate-800">Unable to load styles</p>
            <p className="text-sm">{loadError}</p>
          </div>
        )}

        {!loadingStyles && !loadError && filteredStyles.length === 0 && (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-slate-50 text-slate-400">
              <Shirt className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">No styles found</p>
            <p className="mt-1 text-sm text-slate-500">{styles.length === 0 ? 'Create a new style to add one.' : 'Adjust search or filters to see more results.'}</p>
          </div>
        )}

        {!loadingStyles && !loadError && filteredStyles.length > 0 && (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[1040px] w-full table-fixed border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                  <tr>
                    {['Style', 'SKU', 'Sizes', 'Color', 'Stages', 'Total Cost', 'Status', 'Actions'].map((heading) => (
                      <th key={heading} className="border-b border-slate-200 px-4 py-3">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStyles.map((style) => (
                    <tr key={style._id} className="h-20 hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {renderImage(style)}
                          <div className="min-w-0">
                            <div title={style.name} className="truncate text-sm font-bold text-slate-900">{style.name || 'Untitled style'}</div>
                            <div title={style.skuId} className="mt-1 truncate text-xs text-slate-500">{style.skuId || 'No SKU'}</div>
                          </div>
                        </div>
                      </td>
                      <td title={style.skuId} className="truncate px-4 py-3 text-sm text-slate-700">{style.skuId || '-'}</td>
                      <td className="px-4 py-3">{renderSizeChips(style, true)}</td>
                      <td className="px-4 py-3">{renderColor(style)}</td>
                      <td className="px-4 py-3">{renderStages(style)}</td>
                      <td className="px-4 py-3 text-sm font-extrabold text-slate-900">₹{getTotalCost(style)}</td>
                      <td className="px-4 py-3">{renderStatus(style)}</td>
                      <td className="px-4 py-3">{renderActions(style)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="hidden overflow-x-auto md:block lg:hidden">
              <table className="min-w-[760px] w-full table-fixed border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                  <tr>
                    {['Style', 'Variants', 'Stages', 'Cost', 'Status', 'Actions'].map((heading) => (
                      <th key={heading} className="border-b border-slate-200 px-3 py-3">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStyles.map((style) => (
                    <tr key={style._id} className="h-20 hover:bg-slate-50/70">
                      <td className="px-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {renderImage(style)}
                          <div className="min-w-0">
                            <div title={style.name} className="truncate text-sm font-bold text-slate-900">{style.name || 'Untitled style'}</div>
                            <div title={style.skuId} className="mt-1 truncate text-xs text-slate-500">{style.skuId || 'No SKU'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-2">
                          {renderSizeChips(style, true)}
                          {renderColor(style)}
                        </div>
                      </td>
                      <td className="px-3 py-3">{renderStages(style)}</td>
                      <td className="px-3 py-3 text-sm font-extrabold text-slate-900">₹{getTotalCost(style)}</td>
                      <td className="px-3 py-3">{renderStatus(style)}</td>
                      <td className="px-3 py-3">{renderActions(style)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:hidden">
              {paginatedStyles.map((style) => (
                <article key={style._id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex gap-3">
                    {renderImage(style, 'h-16 w-16')}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 title={style.name} className="truncate text-sm font-extrabold text-slate-900">{style.name || 'Untitled style'}</h3>
                          <p title={style.skuId} className="mt-1 truncate text-xs text-slate-500">{style.skuId || 'No SKU'}</p>
                        </div>
                        {renderStatus(style)}
                      </div>
                      <div className="mt-2 text-lg font-extrabold text-slate-950">₹{getTotalCost(style)}</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
                    {renderSizeChips(style)}
                    {renderColor(style)}
                    {renderStages(style)}
                  </div>
                  <div className="mt-3 flex justify-end">{renderActions(style)}</div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        itemLabel="styles"
      />

      {detailsStyle && (
        <div className={`fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4 ${sidebarOpen && !isMobile ? 'lg:left-64' : ''}`}>
          <div className="flex h-dvh w-full flex-col overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-[1000px] sm:rounded-2xl">
            <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-600">Style Details</p>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-3">
                  <h2 title={detailsStyle.name} className="truncate text-xl font-extrabold text-slate-950 sm:text-2xl">
                    {detailsStyle.name || 'Untitled style'}
                  </h2>
                  {renderStatus(detailsStyle)}
                </div>
                <p title={detailsStyle.skuId} className="mt-1 truncate text-sm text-slate-500">{detailsStyle.skuId || 'No SKU'}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={() => setDetailsStyle(null)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                  aria-label="Close style details"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
                <section className="space-y-3">
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    {getPhotoUrl((detailsStyle.photos || [])[0]) ? (
                      <img
                        src={getPhotoUrl((detailsStyle.photos || [])[0])}
                        alt={detailsStyle.name ? `${detailsStyle.name} preview` : 'Style preview'}
                        className="h-52 w-full object-cover sm:h-60 lg:h-60"
                      />
                    ) : (
                      <div className="flex h-52 w-full items-center justify-center text-slate-400 sm:h-60 lg:h-60">
                        <ImageIcon className="h-12 w-12" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {(detailsStyle.photos || []).length > 1 && (detailsStyle.photos || []).map((photo, index) => {
                      const url = getPhotoUrl(photo);
                      if (!url) return null;
                      return (
                        <button
                          key={`${detailsStyle._id}-detail-photo-${index}`}
                          type="button"
                          onClick={() => openGallery(detailsStyle.photos || [], index)}
                          className="aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                          aria-label={`Open photo ${index + 1}`}
                        >
                          <img src={url} alt={`Style photo ${index + 1}`} className="h-full w-full object-cover" />
                        </button>
                      );
                    })}
                    <div className="flex aspect-square items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                      <Plus className="h-5 w-5" />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-slate-200 p-4">
                      <p className="text-xs font-bold uppercase text-slate-400">Total Cost</p>
                      <p className="mt-1 text-2xl font-extrabold text-slate-950">₹{getTotalCost(detailsStyle)}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 p-4">
                      <p className="text-xs font-bold uppercase text-slate-400">Status</p>
                      <div className="mt-2">{renderStatus(detailsStyle)}</div>
                    </div>
                    <div className="rounded-md border border-slate-200 p-4">
                      <p className="text-xs font-bold uppercase text-slate-400">Created On</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {detailsStyle.createdAt ? new Date(detailsStyle.createdAt).toLocaleDateString() : 'Not available'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border border-slate-200 p-4">
                    <h3 className="text-sm font-bold text-slate-900">Variants</h3>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400">Sizes</p>
                        <div className="mt-3">{renderSizeChips(detailsStyle)}</div>
                      </div>
                      <div className="sm:border-l sm:border-slate-200 sm:pl-4">
                        <p className="text-xs font-bold uppercase text-slate-400">Colors</p>
                        {(detailsStyle.colors || []).length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(detailsStyle.colors || []).map((color, index) => (
                              <span key={`${detailsStyle._id}-detail-color-${color}-${index}`} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                                <span className="h-2.5 w-2.5 rounded-full border border-slate-300" style={{ backgroundColor: getColorValue(color) }} />
                                {color}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-400">No colors added.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              <section className="mt-5 rounded-md border border-slate-200 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-violet-600" />
                  <h3 className="text-sm font-extrabold text-slate-900">Production Workflow</h3>
                </div>
                {(detailsStyle.steps || []).length ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {(detailsStyle.steps || []).map((step, index) => {
                      const rawStageId = step.stageId?._id || step.stageId;
                      const StageIcon = stepIcons[index % stepIcons.length] || Scissors;
                      return (
                        <div key={`${detailsStyle._id}-detail-step-${step.label}-${index}`} className="rounded-md border border-slate-200 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-700">
                                <StageIcon className="h-5 w-5" />
                                <span className="absolute -left-1 -top-2 rounded-full border border-violet-200 bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-violet-700">
                                  {String(index + 1).padStart(2, '0')}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-extrabold text-slate-900">{step.label}</p>
                                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{rawStageId ? 'Reusable production stage' : 'Custom stage'}</p>
                              </div>
                            </div>
                            <p className="shrink-0 text-base font-extrabold text-slate-950">₹{Number(step.price || 0)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">No stages added.</p>
                )}
              </section>
            </div>

            <div className="sticky bottom-0 z-20 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={() => setDetailsStyle(null)}
                className="min-h-11 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const style = detailsStyle;
                  setDetailsStyle(null);
                  openEditStyle(style);
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700"
              >
                <Pencil className="h-4 w-4" />
                Edit Style
              </button>
            </div>
          </div>
        </div>
      )}

      {/* create style modal */}
      {isOpen && (
        <div className={`fixed inset-0 z-40 flex items-start justify-center p-3 sm:p-5 lg:p-6 ${sidebarOpen && !isMobile ? 'lg:left-64' : ''}`}>
          <div className="absolute inset-0 cursor-pointer bg-black/40" onClick={closeStyleModal} />
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
                    <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">{editingStyle ? 'Edit Style' : 'Create New Style'}</h2>
                    <p className="mt-1 text-sm text-slate-500">Upload photos, set sizes, colors and per-step pricing.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeStyleModal}
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
                  <button type="button" onClick={closeStyleModal} className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                  <button type="button" onClick={saveStyle} disabled={savingStyle} className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50">
                    {savingStyle ? 'Saving...' : editingStyle ? 'Update Style' : 'Save'}
                  </button>
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
