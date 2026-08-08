// import React, { useState } from 'react';
// import { Plus, Package, Edit3, Trash2, Filter } from 'lucide-react';

// export const StockManagement = () => {
//   const [color,setColor] = useState("#ff0000")
//   const [stocks, setStocks] = useState([
//     { id: '1', vendor: 'Textile Corp', color: 'Navy Blue', size:10, quantity: 150, unitPrice: 25, dateAdded: '2025-01-10' },
//     { id: '2', vendor: 'Cotton Mills', color: 'White', size:40, quantity: 200, unitPrice: 20, dateAdded: '2025-01-09' },
//     { id: '3', vendor: 'Fabric Co', color: 'Black', size:50, quantity: 80, unitPrice: 30, dateAdded: '2025-01-08' },
//     { id: '4', vendor: 'Textile Corp', color: 'Red', size:20, quantity: 120, unitPrice: 25, dateAdded: '2025-01-07' }
//   ]);

//   const [showAddForm, setShowAddForm] = useState(false);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [selectedVendor, setSelectedVendor] = useState('all');

//   const vendors = Array.from(new Set(stocks.map(s => s.vendor)));
//   const filteredStocks = stocks.filter(stock => {
//     const matchesSearch =
//       stock.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       stock.vendor.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesVendor = selectedVendor === 'all' || stock.vendor === selectedVendor;
//     return matchesSearch && matchesVendor;
//   });

//   const totalValue = stocks.reduce((sum, stock) => sum + stock.quantity * stock.unitPrice, 0);
//   const totalQuantity = stocks.reduce((sum, stock) => sum + stock.quantity, 0);

//   return (
//     <div className="space-y-6">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
//           <p className="text-gray-600 mt-1">Manage raw cloth inventory</p>
//         </div>
//         <button
//           onClick={() => setShowAddForm(true)}
//           className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//         >
//           <Plus className="w-5 h-5" />
//           <span>Add Stock</span>
//         </button>
//       </div>

//       {/* Summary Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
//           <div className="flex items-center space-x-3">
//             <Package className="w-8 h-8 text-blue-600" />
//             <div>
//               <p className="text-sm font-medium text-gray-600">Total Stock</p>
//               <p className="text-2xl font-bold text-gray-900">{totalQuantity} kg</p>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
//           <div className="flex items-center space-x-3">
//             <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
//               <span className="text-green-600 font-bold">₹</span>
//             </div>
//             <div>
//               <p className="text-sm font-medium text-gray-600">Total Value</p>
//               <p className="text-2xl font-bold text-gray-900">₹{totalValue.toLocaleString()}</p>
//             </div>
//           </div>
//         </div>

//         <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
//           <div className="flex items-center space-x-3">
//             <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
//               <span className="text-purple-600 font-bold">#</span>
//             </div>
//             <div>
//               <p className="text-sm font-medium text-gray-600">Stock Items</p>
//               <p className="text-2xl font-bold text-gray-900">{stocks.length}</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Filters & Table */}
//       <div className="bg-white rounded-xl shadow-sm border border-gray-200">
//         <div className="p-6 border-b border-gray-200">
//           <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
//             <div className="flex items-center space-x-4">
//               {/* Search */}
//               <div className="relative">
//                 <input
//                   type="text"
//                   placeholder="Search by color or vendor..."
//                   value={searchTerm}
//                   onChange={(e) => setSearchTerm(e.target.value)}
//                   className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 />
//               </div>

//               {/* Vendor Filter */}
//               <div className="relative">
//                 <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
//                 <select
//                   value={selectedVendor}
//                   onChange={(e) => setSelectedVendor(e.target.value)}
//                   className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
//                 >
//                   <option value="all">All Vendors</option>
//                   {vendors.map((vendor) => (
//                     <option key={vendor} value={vendor}>
//                       {vendor}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Table */}
//         <div className="overflow-x-auto">
//           <table className="w-full">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Vendor
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Color
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Size (mm)
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Quantity (kg)
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Unit Price
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Total Value
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Date Added
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Actions
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {filteredStocks.map((stock) => (
//                 <tr key={stock.id} className="hover:bg-gray-50 transition-colors">
//                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
//                     {stock.vendor}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <div className="flex items-center space-x-3">
//                       <div
//                         className="w-4 h-4 rounded-full border border-gray-300"
//                         style={{ backgroundColor: stock.color.toLowerCase().replace(' ', '') }}
//                       ></div>
//                       <span className="text-sm text-gray-900">{stock.color}</span>
//                     </div>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stock.size}</td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stock.quantity}</td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{stock.unitPrice}</td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
//                     ₹{(stock.quantity * stock.unitPrice).toLocaleString()}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                     {new Date(stock.dateAdded).toLocaleDateString()}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                     <div className="flex space-x-2">
//                       <button className="p-1 text-blue-600 hover:text-blue-800 transition-colors">
//                         <Edit3 className="w-4 h-4" />
//                       </button>
//                       <button className="p-1 text-red-600 hover:text-red-800 transition-colors">
//                         <Trash2 className="w-4 h-4" />
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Add Stock Form */}
//       {showAddForm && (
//         <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
//             <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Stock</h2>
//             <form className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
//                 <input
//                   type="text"
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   placeholder="Enter vendor name"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
//                 {/* <input
//                   type="text"
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   placeholder="Enter color"
//                 /> */}
//                 <div className="flex items-center gap-2">
//                   <input
//                     type="color"
//                     value={color}
//                     onChange={(e) => setColor(e.target.value)}
//                     className="w-10 h-10 p-0 border-none rounded cursor-pointer"
//                   />
//                   <p className='text-gray-500'>choose color</p>
//                 </div>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label>
//                 <input
//                   type="number"
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   placeholder="Enter quantity"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
//                 <input
//                   type="number"
//                   step="0.01"
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   placeholder="Enter unit price"
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Size (mm)</label>
//                 <input
//                   type="number"
//                   step="0.01"
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   placeholder="Enter size"
//                 />
//               </div>
//               <div className="flex space-x-3 pt-4">
//                 <button
//                   type="button"
//                   onClick={() => setShowAddForm(false)}
//                   className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//                 >
//                   Add Stock
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };


import React, { useState, useEffect } from 'react';
import {
  Plus,
  Package,
  Edit3,
  Trash2,
  Filter,
  Search,
  IndianRupee,
  Hash,
  Palette,
  Store,
  Ruler,
  Scale,
  CalendarDays,
  Save,
  Shirt,
  Upload,
  ImageIcon,
  X,
  RotateCw
} from 'lucide-react';
import stockService from '../services/stockServices';
import PaginationControls from '../ui/PaginationControls';
import { useClientPagination } from '../../hooks/useClientPagination';
import api from '../../api/api';
import { dataCache } from '../../utils/dataCache';

const emptyStockForm = {
  vendor: '',
  color: { name: 'Red', hex: '#ff0000' },
  quantityKg: '',
  unitPrice: '',
  sizeMm: '',
  fabric: '',
  image: ''
};

const namedColors = {
  black: '#000000',
  blue: '#0000ff',
  brown: '#8b4513',
  cyan: '#00ffff',
  gray: '#808080',
  green: '#008000',
  grey: '#808080',
  indigo: '#4f46e5',
  lime: '#00ff00',
  magenta: '#ff00ff',
  maroon: '#800000',
  navy: '#000080',
  orange: '#ffa500',
  pink: '#ffc0cb',
  purple: '#800080',
  red: '#ff0000',
  violet: '#8a2be2',
  white: '#ffffff',
  yellow: '#ffff00'
};

const normalizeHex = (value) => {
  const color = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return `#${color.slice(1).split('').map((char) => char + char).join('')}`.toLowerCase();
  }
  return null;
};

const detectColorHex = (value) => {
  const color = String(value || '').trim().toLowerCase();
  if (!color) return null;
  const hex = normalizeHex(color);
  if (hex) return hex;
  if (namedColors[color]) return namedColors[color];

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#000000';
      context.fillStyle = color;
      const detected = context.fillStyle;
      return detected !== '#000000' || color === 'black' ? normalizeHex(detected) : null;
    }
  }

  return null;
};

const getStockId = (stock) => stock?.id ?? stock?._id;

const getColorLabel = (color) => {
  if (typeof color === 'string') return color;
  return color?.name || 'Custom';
};

const getColorHex = (color) => {
  if (typeof color === 'string') return detectColorHex(color) || '#ffffff';
  return normalizeHex(color?.hex) || detectColorHex(color?.name) || '#ffffff';
};

export const StockManagement = () => {
  const cachedStocks = dataCache.getCache('stocks');
  const [stocks, setStocks] = useState(cachedStocks || []);
  const [loadingStocks, setLoadingStocks] = useState(!cachedStocks);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStock, setEditingStock] = useState(null);
  const [savingStock, setSavingStock] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [newStock, setNewStock] = useState(emptyStockForm);

  const loadStocks = async (isManualRefresh = false) => {
    if (isManualRefresh || !dataCache.getCache('stocks')) {
      setLoadingStocks(true);
    }
    try {
      const data = await stockService.fetchStocks();
      const fetched = data || [];
      setStocks(fetched);
      dataCache.setCache('stocks', fetched);
    } catch (err) {
      console.error('Failed to load stocks', err);
    } finally {
      setLoadingStocks(false);
    }
  };

  useEffect(() => {
    loadStocks();

    const handleGlobalRefresh = () => {
      loadStocks();
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => window.removeEventListener('app:refresh', handleGlobalRefresh);
  }, []);

  const vendors = Array.from(new Set(stocks.map((s) => s.vendor).filter(Boolean)));

  const handleImageUpload = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      const signatureRes = await api.post('/uploads/cloudinary/signature', {
        files: [{ name: file.name, type: file.type, size: file.size }]
      });
      const uploadConfig = signatureRes.data?.data || {};
      if (!uploadConfig.cloudName || !uploadConfig.apiKey || !uploadConfig.signature || !uploadConfig.timestamp) {
        alert('Unable to prepare secure upload to Cloudinary.');
        return;
      }

      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', uploadConfig.apiKey);
      fd.append('timestamp', uploadConfig.timestamp);
      fd.append('signature', uploadConfig.signature);
      fd.append('folder', uploadConfig.folder);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${uploadConfig.cloudName}/image/upload`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Cloudinary stock image upload failed', data);
        alert(data?.error?.message || 'Image upload failed');
        return;
      }
      const url = data.secure_url || data.url;
      if (url) {
        setNewStock((prev) => ({ ...prev, image: url }));
      }
    } catch (err) {
      console.error('Cloudinary upload error:', err);
      alert('Failed to upload image to Cloudinary.');
    } finally {
      setUploadingImage(false);
    }
  };

  const filteredStocks = stocks.filter((stock) => {
    const colorName = getColorLabel(stock.color).toLowerCase();
    const fabricName = (stock.fabric ?? '').toLowerCase();
    const matchesSearch =
      colorName.includes(searchTerm.toLowerCase()) ||
      fabricName.includes(searchTerm.toLowerCase()) ||
      (stock.vendor ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVendor = selectedVendor === 'all' || stock.vendor === selectedVendor;

    return matchesSearch && matchesVendor;
  });

  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems: paginatedStocks,
    handlePageChange
  } = useClientPagination(filteredStocks, 10);

  const totalValue = stocks.reduce((sum, stock) => {
    const q = Number(stock.quantityKg) || 0;
    const p = Number(stock.unitPrice) || 0;
    return sum + q * p;
  }, 0);

  const totalQuantity = stocks.reduce((sum, stock) => sum + (Number(stock.quantityKg) || 0), 0);

  const openAddStock = () => {
    setEditingStock(null);
    setNewStock(emptyStockForm);
    setShowAddForm(true);
  };

  const openEditStock = (stock) => {
    setEditingStock(stock);
    setNewStock({
      vendor: stock.vendor || '',
      color: {
        name: getColorLabel(stock.color),
        hex: getColorHex(stock.color)
      },
      quantityKg: stock.quantityKg ?? '',
      unitPrice: stock.unitPrice ?? '',
      sizeMm: stock.sizeMm ?? '',
      fabric: stock.fabric || '',
      image: stock.image || ''
    });
    setShowAddForm(true);
  };

  const closeStockForm = () => {
    setShowAddForm(false);
    setEditingStock(null);
    setNewStock(emptyStockForm);
  };

  const updateColorName = (value) => {
    const detectedHex = detectColorHex(value);
    setNewStock((prev) => ({
      ...prev,
      color: {
        name: value,
        hex: detectedHex || prev.color.hex
      }
    }));
  };

  const updateColorHex = (value) => {
    setNewStock((prev) => ({
      ...prev,
      color: {
        name: prev.color.name || 'Custom',
        hex: value
      }
    }));
  };

  const buildPayload = () => ({
    vendor: newStock.vendor.trim(),
    color: {
      name: newStock.color.name.trim() || 'Custom',
      hex: normalizeHex(newStock.color.hex) || '#ff0000'
    },
    quantityKg: Number(newStock.quantityKg),
    unitPrice: Number(newStock.unitPrice),
    sizeMm: newStock.sizeMm !== '' ? Number(newStock.sizeMm) : null,
    fabric: newStock.fabric ? newStock.fabric.trim() : '',
    image: newStock.image ? newStock.image.trim() : ''
  });

  const handleSaveStock = async (e) => {
    e.preventDefault();

    const payload = buildPayload();

    try {
      setSavingStock(true);

      if (editingStock) {
        const stockId = getStockId(editingStock);
        const updated = await stockService.updateStock(stockId, payload);
        if (!updated) throw new Error('No updated stock returned from API');
        setStocks((prev) => prev.map((stock) => (getStockId(stock) === stockId ? { ...stock, ...updated } : stock)));
      } else {
        const created = await stockService.createStock(payload);
        if (!created) throw new Error('No created stock returned from API');
        setStocks((prev) => [...prev, {
          ...created,
          quantityKg: Number(created.quantityKg) || payload.quantityKg,
          unitPrice: Number(created.unitPrice) || payload.unitPrice,
          color: created.color ?? payload.color,
        }]);
      }

      closeStockForm();
    } catch (err) {
      console.error(editingStock ? 'Failed to update stock' : 'Failed to add stock', err);
    } finally {
      setSavingStock(false);
    }
  };

  const getDisplayStock = (stock) => ({
    ...stock,
    color: {
      name: getColorLabel(stock.color),
      hex: getColorHex(stock.color)
    },
  });

  // Delete stock
  const handleDeleteStock = async (id) => {
    try {
      await stockService.deleteStock(id);
      setStocks((prev) => prev.filter((s) => (s.id ?? s._id) !== id));
    } catch (err) {
      console.error('Failed to delete stock', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Summary Cards */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-gray-600 mt-1">Manage raw cloth inventory</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadStocks(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer"
            title="Force refresh stock data"
          >
            <RotateCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={openAddStock}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white p-3.5 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Stock</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{totalQuantity} kg</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3.5 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 shrink-0">
              <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Value</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">₹{totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3.5 sm:p-6 rounded-xl shadow-sm border border-gray-200 col-span-2 md:col-span-1">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
              <Hash className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Stock Items</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{stocks.length}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Filters & Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by color or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="relative w-full sm:w-48">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">All Vendors</option>
                  {vendors.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-2"><Store className="h-3.5 w-3.5" /> Vendor</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-2"><Shirt className="h-3.5 w-3.5" /> Fabric</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-2"><Palette className="h-3.5 w-3.5" /> Color</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-2"><Ruler className="h-3.5 w-3.5" /> Size (mm)</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-2"><Scale className="h-3.5 w-3.5" /> Quantity (kg)</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-2"><IndianRupee className="h-3.5 w-3.5" /> Unit Price</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Date Added</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingStocks ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 w-10 bg-slate-200 rounded-lg" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                  </tr>
                ))
              ) : paginatedStocks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-sm text-gray-500">
                    No stocks available.
                  </td>
                </tr>
              ) : (
                paginatedStocks.map((stock) => {
                const displayStock = getDisplayStock(stock);
                const keyId = getStockId(displayStock);
                return (
                  <tr key={keyId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {displayStock.image ? (
                        <img
                          src={displayStock.image}
                          alt={displayStock.fabric || 'Stock preview'}
                          className="h-10 w-10 rounded-lg object-cover border border-gray-200 shadow-xs"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400">
                          <ImageIcon className="h-5 w-5 stroke-1" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {displayStock.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {displayStock.fabric ? (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                          {displayStock.fabric}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: displayStock.color.hex }}
                        ></div>
                        <span className="text-sm text-gray-900">{displayStock.color.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{displayStock.sizeMm}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{displayStock.quantityKg}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{displayStock.unitPrice}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₹{(Number(displayStock.quantityKg) * Number(displayStock.unitPrice)).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {displayStock.dateAdded ? new Date(displayStock.dateAdded).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditStock(displayStock)}
                          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                          aria-label={`Edit ${displayStock.vendor} stock`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          onClick={() => handleDeleteStock(keyId)}
                          aria-label={`Delete ${displayStock.vendor} stock`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 pb-6">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            itemLabel="stock items"
          />
        </div>
      </div>

      {/* Stock Form */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                {editingStock ? <Edit3 className="h-5 w-5" /> : <Package className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingStock ? 'Edit Stock' : 'Add New Stock'}</h2>
                <p className="text-sm text-gray-500">{editingStock ? 'Update raw cloth inventory details' : 'Add raw cloth inventory details'}</p>
              </div>
            </div>
            <form className="space-y-4" onSubmit={handleSaveStock}>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Vendor</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter vendor name"
                    value={newStock.vendor}
                    onChange={(e) => setNewStock({ ...newStock, vendor: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div className="relative">
                    <Palette className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="Type color name or hex"
                      value={newStock.color.name}
                      onChange={(e) => updateColorName(e.target.value)}
                      required
                    />
                  </div>
                  <input
                    type="color"
                    value={normalizeHex(newStock.color.hex) || '#ff0000'}
                    onChange={(e) => updateColorHex(e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
                    aria-label="Choose stock color"
                  />
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span className="h-3 w-3 rounded-full border border-gray-300" style={{ backgroundColor: normalizeHex(newStock.color.hex) || '#ff0000' }} />
                  <span>{normalizeHex(newStock.color.hex) || '#ff0000'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fabric Type</label>
                  <div className="relative">
                    <Shirt className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Cotton, Silk, Denim"
                      value={newStock.fabric}
                      onChange={(e) => setNewStock({ ...newStock, fabric: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Size (mm)</label>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter size"
                      value={newStock.sizeMm}
                      onChange={(e) => setNewStock({ ...newStock, sizeMm: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Quantity (kg)</label>
                  <div className="relative">
                    <Scale className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter quantity"
                      value={newStock.quantityKg}
                      onChange={(e) => setNewStock({ ...newStock, quantityKg: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Unit Price (₹)</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter unit price"
                      value={newStock.unitPrice}
                      onChange={(e) => setNewStock({ ...newStock, unitPrice: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Cloudinary Stock Image Picker */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Stock Image (Cloudinary)</label>
                <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-3">
                  {newStock.image ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 shadow-xs shrink-0">
                      <img src={newStock.image} alt="Fabric preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewStock((prev) => ({ ...prev, image: '' }))}
                        className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow hover:bg-red-700"
                        title="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white text-gray-400 shrink-0">
                      <ImageIcon className="h-6 w-6 stroke-1" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      id="stock-image-file-input"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await handleImageUpload(file);
                          e.target.value = '';
                        }
                      }}
                    />
                    <label
                      htmlFor="stock-image-file-input"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
                    >
                      <Upload className="h-4 w-4 text-blue-600" />
                      {uploadingImage ? 'Uploading to Cloudinary...' : newStock.image ? 'Change Image' : 'Select Image'}
                    </label>
                    <p className="mt-1 text-[11px] text-gray-500">Stored automatically in Cloudinary</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
                <button
                  type="button"
                  onClick={closeStockForm}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStock || uploadingImage}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {editingStock ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {savingStock ? 'Saving...' : editingStock ? 'Save Changes' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
