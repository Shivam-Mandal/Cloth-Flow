// src/components/admin/OrderManagement.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Plus, ShoppingCart, Eye, Edit3, Calendar } from "lucide-react";
import * as orderService from "../services/orderServices";
import * as styleService from "../services/styleServices";
import stockService from "../services/stockServices";
import PaginationControls from "../ui/PaginationControls";
import { useClientPagination } from "../../hooks/useClientPagination";

export const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [styles, setStyles] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedStyleId, setSelectedStyleId] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [pieces, setPieces] = useState({});
  const [requiredKgInput, setRequiredKgInput] = useState("");
  const [deadlineInput, setDeadlineInput] = useState(""); // yyyy-mm-dd from input
  const [priorityInput, setPriorityInput] = useState("Normal");
  const [photoMap, setPhotoMap] = useState({});

  // NEW: submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper: normalize API result into an array of orders
  const normalizeOrdersResponse = (res) => {
    const data = res?.data ?? res;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.orders)) return data.orders;
    return [];
  };

  // normalize a single order object (make sure it has _id, id and orderId)
  const normalizeOrder = (o) => {
    if (!o) return o;
    return {
      ...o,
      _id: o._id || o.id || (o.order && (o.order._id || o.order.id)) || o._id,
      id: o.id || o._id || (o.order && (o.order._id || o.order.id)) || o.id,
      orderId: o.orderId || o.orderID || o.orderId || (o.order && o.order.orderId) || undefined,
      styleSnapshot: o.styleSnapshot || o.style_snapshot || (o.style && o.style.styleSnapshot) || o.styleSnapshot,
    };
  };

  // === Fetch styles on mount ===
  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const data = await styleService.fetchStyles();
        setStyles(data || []);
        
        // Create a map of styleId to photo/image
        const photos = {};
        (data || []).forEach((style) => {
          if (style._id || style.id) {
            const styleId = style._id || style.id;
            // Extract first photo from photos array
            photos[styleId] = (style.photos && style.photos[0]) || style.photo || style.image || style.imageUrl || null;
          }
        });
        setPhotoMap(photos);
      } catch (err) {
        console.error("Failed to fetch styles:", err);
      }
    };
    fetchStyles();
  }, []);

  // === Fetch vendors on mount ===
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const data = await stockService.fetchVendors();
        setVendors(data || []);
      } catch (err) {
        console.error("Failed to fetch vendors:", err);
      }
    };
    fetchVendors();
  }, []);

  // === Fetch orders on mount ===
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await orderService.getOrders();
        const arr = normalizeOrdersResponse(res);
        setOrders((arr || []).map(normalizeOrder));
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      }
    };
    fetchOrders();
  }, []);

  // When style changes: initialize pieces grid (color -> size -> qty)
  const handleStyleChange = (styleId) => {
    setSelectedStyleId(styleId);
    const style = styles.find((s) => s._id === styleId || s.id === styleId);
    if (!style) {
      setPieces({});
      return;
    }
    const initialPieces = {};
    (style.colors || []).forEach((color) => {
      initialPieces[color] = {};
      (style.sizes || []).forEach((size) => {
        initialPieces[color][size] = 0;
      });
    });
    setPieces(initialPieces);
  };

  const updatePiece = (color, size, value) => {
    setPieces((prev) => ({
      ...prev,
      [color]: { ...prev[color], [size]: Number(value) },
    }));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!selectedStyleId) return alert("Select a style first");

    try {
      setIsSubmitting(true); // <-- disable UI while waiting

      const payload = {
        styleId: selectedStyleId,
        pieces,
        requiredKg: requiredKgInput ? Number(requiredKgInput) : undefined,
        deadline: deadlineInput ? new Date(deadlineInput).toISOString() : undefined,
        priority: priorityInput || "Normal",
        vendor: selectedVendor || undefined,
      };

      const data = await orderService.createOrder(payload);

      let created = null;
      if (!data) {
        created = null;
      } else if (data.order) {
        created = data.order;
      } else if (data._id || data.id || data.orderId) {
        created = data;
      } else if (Array.isArray(data)) {
        created = data[0] || null;
      }

      if (!created) {
        const serverMessage = data?.message || data?.error || JSON.stringify(data);
        console.error("Create returned unexpected shape", data);
        alert("Order created but client couldn't parse response. Check console. " + serverMessage);
        return;
      }

      const normalized = normalizeOrder(created);
      setOrders((prev) => [normalized, ...prev]);

      alert("Order created successfully!");
      setShowCreateForm(false);
      setSelectedStyleId("");
      setSelectedVendor("");
      setPieces({});
      setRequiredKgInput("");
      setDeadlineInput("");
      setPriorityInput("Normal");
    } catch (err) {
      console.error("Error creating order (catch):", err);
      const serverResponse = err?.response?.data;
      const serverMsg =
        serverResponse?.message ||
        serverResponse?.error ||
        (typeof serverResponse === "string" ? serverResponse : null) ||
        err?.message ||
        "Unknown error";
      console.error("Server error payload:", serverResponse ?? err);
      alert(`Failed to create order: ${serverMsg}`);
    } finally {
      setIsSubmitting(false); // <-- re-enable UI
    }
  };

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in progress":
        return "bg-blue-100 text-blue-800";
      case "delayed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    switch ((priority || "").toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const selectedStyle = styles.find((s) => s._id === selectedStyleId || s.id === selectedStyleId);

  const stats = useMemo(() => {
    const total = orders.length;
    const inProgress = orders.filter((o) => (o.currentStage || "").toLowerCase() === "in progress").length;
    const completed = orders.filter((o) => (o.currentStage || "").toLowerCase() === "completed").length;
    const delayed = orders.filter((o) => (o.currentStage || "").toLowerCase() === "delayed").length;
    return { total, inProgress, completed, delayed };
  }, [orders]);

  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems: paginatedOrders,
    handlePageChange
  } = useClientPagination(orders, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-1">Create and track production orders</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Order</span>
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "All Orders", count: stats.total },
          { label: "In Progress", count: stats.inProgress },
          { label: "Completed", count: stats.completed },
          { label: "Delayed", count: stats.delayed },
        ].map((card) => (
          <div key={card.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.count}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Orders</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Photos",
                  "Order ID",
                  "Design",
                  "Vendor",
                  "Required Kg",
                  "Current Stage",
                  "Progress",
                  "Workers",
                  "Priority",
                  "Deadline",
                  "Actions",
                ].map((head) => (
                  <th
                    key={head}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-6 text-gray-500">
                    No orders available
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((orderRaw) => {
                  const order = normalizeOrder(orderRaw);
                  const styleId = order.style._id;
                  const styleImage = photoMap[styleId];
                  return (
                    <tr key={order.orderId || order._id || order.id} className="hover:bg-gray-50 transition-colors">
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        {styleImage ? (
                          <div className="flex items-center justify-center">
                            <img 
                              src={styleImage} 
                              alt="Style" 
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">No image</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.orderId || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.styleSnapshot?.name || order.design || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.vendor || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.requiredKg || 0} kg</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            order.currentStage
                          )}`}
                        >
                          {order.currentStage || "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${order.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{order.progress || 0}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.assignedWorkers || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(order.priority)}`}
                        >
                          {order.priority || "Normal"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{order.deadline ? new Date(order.deadline).toLocaleDateString() : "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          <button className="p-1 text-blue-600 hover:text-blue-800 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-green-600 hover:text-green-800 transition-colors">
                            <Edit3 className="w-4 h-4" />
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
            itemLabel="orders"
          />
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Order</h2>
            <form className="space-y-4" onSubmit={handleCreateOrder}>
              {/* Style select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                <select
                  value={selectedStyleId}
                  onChange={(e) => handleStyleChange(e.target.value)}
                  className="w-full border p-2 rounded"
                  disabled={isSubmitting} // disable while submitting
                >
                  <option value="">Select style</option>
                  {styles.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vendor select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full border p-2 rounded"
                  disabled={isSubmitting}
                >
                  <option value="">Select vendor (optional)</option>
                  {vendors.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
              </div>

              {/* Required Kg & Deadline & Priority */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Kg (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={requiredKgInput}
                    onChange={(e) => setRequiredKgInput(e.target.value)}
                    className="w-full border p-2 rounded"
                    placeholder="e.g. 12.5"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={deadlineInput}
                    onChange={(e) => setDeadlineInput(e.target.value)}
                    className="w-full border p-2 rounded"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={priorityInput}
                    onChange={(e) => setPriorityInput(e.target.value)}
                    className="w-full border p-2 rounded"
                    disabled={isSubmitting}
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {/* Dynamic table for sizes & colors */}
              {selectedStyle && (
                <div className="overflow-x-auto border rounded p-3 bg-gray-50">
                  <table className="min-w-full table-fixed">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 text-left">Color</th>
                        {(selectedStyle.sizes || []).map((size) => (
                          <th key={size} className="px-3 py-2 text-left">
                            {size}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedStyle.colors || []).map((color) => (
                        <tr key={color} className="bg-white odd:bg-white even:bg-gray-50">
                          <td className="px-3 py-2">{color}</td>
                          {(selectedStyle.sizes || []).map((size) => (
                            <td key={size} className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                value={pieces?.[color]?.[size] ?? 0}
                                onChange={(e) => updatePiece(color, size, e.target.value)}
                                className="w-20 px-2 py-1 border rounded text-sm"
                                disabled={isSubmitting}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (isSubmitting) return; // prevent closing while submitting
                    setShowCreateForm(false);
                    setSelectedStyleId("");
                    setSelectedVendor("");
                    setPieces({});
                    setRequiredKgInput("");
                    setDeadlineInput("");
                    setPriorityInput("Normal");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 rounded-lg text-white ${isSubmitting ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      {/* small spinner */}
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.2"></circle>
                        <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"></path>
                      </svg>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    "Create Order"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
