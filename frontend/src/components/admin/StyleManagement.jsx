// src/pages/StyleManagement.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, ImageIcon, Trash, ChevronLeft, ChevronRight } from 'lucide-react';
import * as styleService  from '../services/styleServices'; // <-- ensure this file exists

// Cloudinary setup: use Vite env vars
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'your_cloud_name';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'your_upload_preset';

const defaultSteps = [
  'Step 1',
  'Step 2',
  'Step 3',
  'Step 4',
  'Step 5',
  'Step 6',
  'Step 7',
  'Step 8',
];

export default function StyleManagement() {
  const [styles, setStyles] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [sizes, setSizes] = useState({ S: false, M: false, L: false, XL: false, X: false });
  const [colors, setColors] = useState([]);
  const colorRef = useRef();
  const [photos, setPhotos] = useState([]); // { url, filename } or string URLs
  const [stepPrices, setStepPrices] = useState(defaultSteps.map(() => ''));
  const [stepsLabels, setStepsLabels] = useState(defaultSteps);

  // gallery modal state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]); // array of urls
  const [galleryIndex, setGalleryIndex] = useState(0);
  const thumbnailsRef = useRef(null);
  const fileInputRef = useRef(null);

  // Utility: build absolute photo URL if needed
  const getPhotoUrl = useCallback((urlOrObj) => {
    if (!urlOrObj) return '';
    if (typeof urlOrObj === 'object' && urlOrObj.url) return urlOrObj.url;
    const val = typeof urlOrObj === 'string' ? urlOrObj : '';
    if (!val) return '';
    if (/^https?:\/\//i.test(val)) return val;
    if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'your_cloud_name') return val;
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${val}`;
  }, []);

  // fetch styles on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await styleService.fetchStyles();
        if (mounted) setStyles(data || []);
      } catch (err) {
        console.error('Failed to fetch styles', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  function resetForm() {
    setName('');
    setSku('');
    setSizes({ S: false, M: false, L: false, XL: false, X: false });
    setColors([]);
    setPhotos([]);
    setStepPrices(defaultSteps.map(() => ''));
    setStepsLabels(defaultSteps);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function uploadFilesToCloudinary(files) {
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
  }

  const handlePhotoInput = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newUploaded = await uploadFilesToCloudinary(files);
    setPhotos(prev => [...prev, ...newUploaded]);
    // clear file input for next selection
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

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

  const toggleSize = useCallback((key) => {
    setSizes(s => ({ ...s, [key]: !s[key] }));
  }, []);

  const updateStepLabel = useCallback((index, value) => {
    setStepsLabels(s => s.map((l, i) => (i === index ? value : l)));
  }, []);

  const updateStepPrice = useCallback((index, value) => {
    setStepPrices(p => p.map((pv, i) => (i === index ? value : pv)));
  }, []);

  const addStep = useCallback(() => {
    setStepsLabels(s => [...s, `Step ${s.length + 1}`]);
    setStepPrices(p => [...p, '']);
  }, []);

  const removeStep = useCallback((index) => {
    setStepsLabels(s => s.filter((_, i) => i !== index));
    setStepPrices(p => p.filter((_, i) => i !== index));
  }, []);

  const saveStyle = useCallback(async () => {
    const selectedSizes = Object.keys(sizes).filter(k => sizes[k]);
    if (!name.trim() || !sku.trim()) return alert('Name and SKU required');

    const photoUrls = photos.map(p => (typeof p === 'string' ? p : p.url));

    const payload = {
      name,
      skuId: sku,
      photos: photoUrls,
      sizes: selectedSizes,
      colors,
      steps: stepsLabels.map((label, i) => ({ label, price: Number(stepPrices[i] || 0) })),
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
  }, [name, sku, sizes, photos, colors, stepsLabels, stepPrices]);

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
  }, [getPhotoUrl]);

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
  }, [galleryImages.length]);

  const prevImage = useCallback(() => {
    setGalleryIndex(i => {
      if (!galleryImages.length) return 0;
      const ni = (i - 1 + galleryImages.length) % galleryImages.length;
      scrollThumbIntoView(ni);
      return ni;
    });
  }, [galleryImages.length]);

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
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold">Style Management</h1>
          <p className="text-sm text-gray-500">Create and manage style definitions and per-step pricing.</p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg shadow"
        >
          <Plus size={16} /> Create new Style
        </button>
      </header>

      <div className="bg-white rounded-lg shadow border">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">SKU</th>
              <th className="p-4 text-left">Sizes</th>
              <th className="p-4 text-left">Colors</th>
              <th className="p-4 text-left">Photos</th>
              <th className="p-4 text-left">Steps / Prices</th>
              <th className="p-4 text-right">Actions</th>
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

            {styles.map(style => {
              const stylePhotos = style.photos || [];
              const visible = stylePhotos.slice(0, 2); // show only first 2 inline
              const extraCount = Math.max(0, stylePhotos.length - visible.length);

              return (
                <tr key={style._id} className="border-t">
                  <td className="p-4 align-top">{style.name}</td>
                  <td className="p-4 align-top">{style.skuId}</td>
                  <td className="p-4 align-top">{(style.sizes || []).join(', ')}</td>
                  <td className="p-4 align-top">{(style.colors || []).join(', ')}</td>

                  <td className="p-4 align-top">
                    <div className="flex items-center gap-2">
                      {visible.map((p, i) => {
                        const src = getPhotoUrl(p);
                        return (
                          <img
                            key={i}
                            src={src}
                            alt={`photo-${i}`}
                            className="h-12 w-12 object-cover rounded cursor-pointer"
                            onClick={() => openGallery(stylePhotos, i)}
                            onError={e => (e.currentTarget.style.display = 'none')}
                          />
                        );
                      })}

                      {/* If there are more than 2 photos, show +N button */}
                      {extraCount > 0 && (
                        <button
                          type="button"
                          onClick={() => openGallery(stylePhotos, visible.length)} // open gallery starting at the 3rd image
                          className="h-12 w-12 flex items-center justify-center rounded bg-black/10 text-sm font-medium cursor-pointer border"
                          title={`Show ${stylePhotos.length} images`}
                        >
                          +{extraCount}
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="p-4 align-top">
                    <div className="space-y-1">
                      {(style.steps || []).map((s, i) => (
                        <div key={i} className="text-sm">
                          <strong>{s.label}:</strong> ₹{s.price}
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="p-4 align-top text-right">
                    <button
                      onClick={() => deleteStyle(style._id)}
                      className="px-3 py-1 border rounded text-red-600 hover:bg-red-50"
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

      {/* create style modal */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center p-6">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative z-50 w-full max-w-5xl bg-white rounded-lg shadow-lg overflow-auto max-h-[90vh]"
          >
            <div className="p-6">
              {/* header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Create New Style</h2>
                  <p className="text-sm text-gray-500">Upload photos, set sizes, colors and per-step pricing.</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 rounded hover:bg-gray-100">
                  <X />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* left */}
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium">Style Name</span>
                    <input value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="e.g. Casual Tee" />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium">SKU</span>
                    <input value={sku} onChange={e => setSku(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2" placeholder="unique-sku-001" />
                  </label>

                  <div>
                    <span className="text-sm font-medium">Sizes</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.keys(sizes).map(k => (
                        <button key={k} onClick={() => toggleSize(k)} type="button" className={`px-3 py-1 rounded border ${sizes[k] ? 'bg-emerald-100 border-emerald-300' : 'bg-white'}`}>
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium">Colors</span>
                    <div className="mt-2 flex gap-2 items-center">
                      <input ref={colorRef} className="rounded border px-2 py-1 w-full" placeholder="Add color name e.g. Navy" />
                      <button onClick={addColor} className="px-3 py-1 rounded bg-slate-100 border">Add</button>
                    </div>
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {colors.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 px-2 py-1 border rounded">
                          <span className="text-sm">{c}</span>
                          <button onClick={() => removeColor(i)} className="p-1 rounded hover:bg-gray-100"><Trash size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium">Photos</span>
                    <div className="mt-2">
                      <label className="flex items-center gap-3 p-3 border rounded cursor-pointer">
                        <ImageIcon />
                        <span className="text-sm">Upload photos (multiple)</span>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoInput} className="hidden" />
                      </label>

                      {uploading && <div className="text-sm text-gray-500 mt-2">Uploading images...</div>}

                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {photos.map((p, i) => {
                          const src = getPhotoUrl(p);
                          return (
                            <div key={i} className="relative group">
                              <img src={src} alt={p.filename || `photo-${i}`} className="w-full h-24 object-cover rounded cursor-pointer" onClick={() => openGallery(photos, i)} onError={e => (e.currentTarget.style.display = 'none')} />
                              <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-white p-1 rounded-full opacity-0 group-hover:opacity-100 shadow"><Trash size={14} /></button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* right */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Steps & Prices</h3>
                    <button onClick={addStep} className="px-3 py-1 border rounded">Add Step</button>
                  </div>

                  <div className="space-y-3">
                    {stepsLabels.map((label, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input value={label} onChange={e => updateStepLabel(idx, e.target.value)} className="flex-1 rounded border px-3 py-2" />
                        <input type="number" min="0" value={stepPrices[idx]} onChange={e => updateStepPrice(idx, e.target.value)} placeholder="price" className="w-36 rounded border px-3 py-2" />
                        <button onClick={() => removeStep(idx)} className="px-2 py-1 rounded border">Remove</button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <h4 className="font-medium">Preview total price</h4>
                    <div className="text-2xl font-bold mt-2">₹{stepPrices.reduce((acc, v) => acc + Number(v || 0), 0)}</div>
                  </div>

                  <div className="flex gap-3 mt-4 justify-end">
                    <button onClick={() => { resetForm(); setIsOpen(false); }} className="px-4 py-2 border rounded">Cancel</button>
                    <button onClick={saveStyle} className="px-4 py-2 bg-emerald-500 text-white rounded">Save Style</button>
                  </div>
                </div>
              </div>

              <div className="mt-6 text-sm text-gray-500">
                Tip: step labels can be edited and new steps added. Each step has its own price.
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ---------- Gallery Modal (full-screen) ---------- */}
      {galleryOpen && galleryImages.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          {/* backdrop click closes */}
          <div className="absolute inset-0" onClick={closeGallery} />

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
