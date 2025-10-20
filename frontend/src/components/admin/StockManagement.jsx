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
//               <span className="text-green-600 font-bold">$</span>
//             </div>
//             <div>
//               <p className="text-sm font-medium text-gray-600">Total Value</p>
//               <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
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
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${stock.unitPrice}</td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
//                     ${(stock.quantity * stock.unitPrice).toLocaleString()}
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
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price ($)</label>
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


// src/components/StockManagement.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Package, Edit3, Trash2, Filter } from 'lucide-react';
import stockService from '../services/stockServices';

export const StockManagement = () => {
  const [stocks, setStocks] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [newStock, setNewStock] = useState({
    vendor: '',
    color: { name: 'Custom', hex: '#ff0000' },
    quantityKg: '',
    unitPrice: '',
    sizeMm: ''
  });

  // Fetch stocks on mount
  useEffect(() => {
    async function loadStocks() {
      try {
        const data = await stockService.fetchStocks();
        setStocks(data);
      } catch (err) {
        console.error('Failed to load stocks', err);
      }
    }
    loadStocks();
  }, []);

  const vendors = Array.from(new Set(stocks.map((s) => s.vendor).filter(Boolean)));

  const filteredStocks = stocks.filter((stock) => {
    const matchesSearch =
      (stock.color?.name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (stock.vendor ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVendor = selectedVendor === 'all' || stock.vendor === selectedVendor;

    return matchesSearch && matchesVendor;
  });

  const totalValue = stocks.reduce((sum, stock) => {
    const q = Number(stock.quantityKg) || 0;
    const p = Number(stock.unitPrice) || 0;
    return sum + q * p;
  }, 0);

  const totalQuantity = stocks.reduce((sum, stock) => sum + (Number(stock.quantityKg) || 0), 0);

  // Add stock
  const handleAddStock = async (e) => {
    e.preventDefault();

    const payload = {
      vendor: newStock.vendor.trim(),
      color: { name: newStock.color.name || 'Custom', hex: newStock.color.hex },
      quantityKg: Number(newStock.quantityKg),
      unitPrice: Number(newStock.unitPrice),
      sizeMm: newStock.sizeMm !== '' ? Number(newStock.sizeMm) : null
    };

    try {
      const created = await stockService.createStock(payload); // created is the object
      if (!created) throw new Error('No created stock returned from API');

      // Ensure created has consistent fields (optional normalization)
      const normalized = {
        ...created,
        quantityKg: Number(created.quantityKg) || payload.quantityKg,
        unitPrice: Number(created.unitPrice) || payload.unitPrice,
        color: created.color ?? payload.color,
      };

      setStocks((prev) => [...prev, normalized]);
      setShowAddForm(false);
      setNewStock({
        vendor: '',
        color: { name: 'Custom', hex: '#ff0000' },
        quantityKg: '',
        unitPrice: '',
        sizeMm: ''
      });
    } catch (err) {
      console.error('Failed to add stock', err);
    }
  };

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
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Stock</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Package className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Stock</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuantity} kg</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-bold">$</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-bold">#</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{stocks.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by color or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
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
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size (mm)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity (kg)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Added
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStocks.map((stock) => {
                const keyId = stock.id ?? stock._id;
                return (
                  <tr key={keyId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stock.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: stock.color?.hex ?? stock.color ?? '#fff' }}
                        ></div>
                        <span className="text-sm text-gray-900">{stock.color?.name ?? 'Custom'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stock.sizeMm}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stock.quantityKg}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${stock.unitPrice}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${(Number(stock.quantityKg) * Number(stock.unitPrice)).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {stock.dateAdded ? new Date(stock.dateAdded).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button className="p-1 text-blue-600 hover:text-blue-800 transition-colors">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1 text-red-600 hover:text-red-800 transition-colors"
                          onClick={() => handleDeleteStock(keyId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Stock</h2>
            <form className="space-y-4" onSubmit={handleAddStock}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter vendor name"
                  value={newStock.vendor}
                  onChange={(e) => setNewStock({ ...newStock, vendor: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newStock.color.hex}
                    onChange={(e) => setNewStock({ ...newStock, color: { ...newStock.color, hex: e.target.value, name: 'Custom' } })}
                    className="w-10 h-10 p-0 border-none rounded cursor-pointer"
                  />
                  <p className="text-gray-500">choose color</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (kg)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter quantity"
                  value={newStock.quantityKg}
                  onChange={(e) => setNewStock({ ...newStock, quantityKg: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter unit price"
                  value={newStock.unitPrice}
                  onChange={(e) => setNewStock({ ...newStock, unitPrice: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Size (mm)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter size"
                  value={newStock.sizeMm}
                  onChange={(e) => setNewStock({ ...newStock, sizeMm: e.target.value })}
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

