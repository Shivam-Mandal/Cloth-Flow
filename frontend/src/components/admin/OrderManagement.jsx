// src/components/admin/OrderManagement.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Plus, ShoppingCart, Eye, Edit3, Calendar } from "lucide-react";
import * as orderService from "../services/orderServices";
import * as styleService from "../services/styleServices";

export const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [styles, setStyles] = useState([]);
  const [selectedStyleId, setSelectedStyleId] = useState("");
  const [pieces, setPieces] = useState({});
  const [requiredKgInput, setRequiredKgInput] = useState("");
  const [deadlineInput, setDeadlineInput] = useState(""); // yyyy-mm-dd from input
  const [priorityInput, setPriorityInput] = useState("Normal");

  // Helper: normalize API result into an array of orders
  const normalizeOrdersResponse = (res) => {
    // Accept multiple shapes: res (array), res.data (array), res.data.orders
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
      // styleSnapshot compatibility: prefer snapshot if present
      styleSnapshot: o.styleSnapshot || o.style_snapshot || (o.style && o.style.styleSnapshot) || o.styleSnapshot,
    };
  };

  // === Fetch styles on mount ===
  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const data = await styleService.fetchStyles();
        setStyles(data || []);
      } catch (err) {
        console.error("Failed to fetch styles:", err);
      }
    };
    fetchStyles();
  }, []);

  // === Fetch orders on mount ===
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await orderService.getOrders();
        const arr = normalizeOrdersResponse(res);
        // normalize each order for consistent fields
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
      const payload = {
        styleId: selectedStyleId,
        pieces,
        requiredKg: requiredKgInput ? Number(requiredKgInput) : undefined,
        deadline: deadlineInput ? new Date(deadlineInput).toISOString() : undefined,
        priority: priorityInput || "Normal",
      };

      const res = await orderService.createOrder(payload);

      // Try to obtain created order robustly
      const created =
        res?.data?.order ?? // controller returns { order }
        res?.data ?? // sometimes create returns the created object as data
        res; // fallback

      const normalized = normalizeOrder(created);

      // Add created order to state immediately (most responsive)
      setOrders((prev) => [normalized, ...prev]);

      alert("Order created successfully!");
      setShowCreateForm(false);
      setSelectedStyleId("");
      setPieces({});
      setRequiredKgInput("");
      setDeadlineInput("");
      setPriorityInput("Normal");

      // optional: refetch all orders to keep server-authoritative state
      // const updated = normalizeOrdersResponse(await orderService.getOrders());
      // setOrders((updated || []).map(normalizeOrder));
    } catch (err) {
      console.error("Error creating order:", err);
      alert("Failed to create order.");
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

  // Compute stats from orders (so overview shows real numbers)
  const stats = useMemo(() => {
    const total = orders.length;
    const inProgress = orders.filter((o) => (o.currentStage || "").toLowerCase() === "in progress").length;
    const completed = orders.filter((o) => (o.currentStage || "").toLowerCase() === "completed").length;
    const delayed = orders.filter((o) => (o.currentStage || "").toLowerCase() === "delayed").length;
    return { total, inProgress, completed, delayed };
  }, [orders]);

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
                  "Order ID",
                  "Design",
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
                  <td colSpan={9} className="text-center py-6 text-gray-500">
                    No orders available
                  </td>
                </tr>
              ) : (
                orders.map((orderRaw) => {
                  const order = normalizeOrder(orderRaw);
                  return (
                    <tr key={order.orderId || order._id || order.id} className="hover:bg-gray-50 transition-colors">
                      {/* Order ID: prefer orderId */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.orderId || order._id || order.id}
                      </td>

                      {/* Design: use styleSnapshot.name if available */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.styleSnapshot?.name || order.design || "N/A"}
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
                >
                  <option value="">Select style</option>
                  {styles.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>
                      {s.name}
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={deadlineInput}
                    onChange={(e) => setDeadlineInput(e.target.value)}
                    className="w-full border p-2 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={priorityInput}
                    onChange={(e) => setPriorityInput(e.target.value)}
                    className="w-full border p-2 rounded"
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
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
