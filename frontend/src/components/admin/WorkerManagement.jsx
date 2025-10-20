import React, { useState } from "react";
import {
  UserPlus,
  Edit,
  Trash2,
  Search,
  Users,
  UserCheck,
  Briefcase,
} from "lucide-react";

export const WorkerManagement = () => {
  const [workers, setWorkers] = useState([
    {
      id: 1,
      name: "Ravi Kumar",
      role: "Tailor",
      email: "ravi@example.com",
      phone: "9876543210",
      joined: "2024-01-12",
      status: "Active",
    },
    {
      id: 2,
      name: "Anita Sharma",
      role: "Designer",
      email: "anita@example.com",
      phone: "9123456780",
      joined: "2024-03-22",
      status: "Inactive",
    },
  ]);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    joined: "",
    status: "Active",
  });

  const roles = ["Tailor", "Designer", "Cutter", "Ironing", "Packing"];

  const handleAddOrUpdate = () => {
    if (editingWorker) {
      setWorkers((prev) =>
        prev.map((w) => (w.id === editingWorker.id ? { ...formData, id: w.id } : w))
      );
    } else {
      setWorkers((prev) => [
        ...prev,
        { ...formData, id: Date.now() },
      ]);
    }
    setShowModal(false);
    setEditingWorker(null);
    resetForm();
  };

  const handleEdit = (worker) => {
    setEditingWorker(worker);
    setFormData(worker);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    setWorkers((prev) => prev.filter((w) => w.id !== id));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      email: "",
      phone: "",
      joined: "",
      status: "Active",
    });
  };

  const filteredWorkers = workers.filter(
    (w) =>
      (filterRole === "All" || w.role === filterRole) &&
      (w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Worker Management</h1>
          <p className="text-gray-600 mt-1">Manage all workers and their roles</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <UserPlus size={18} /> Add Worker
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-3">
          <Users className="text-blue-600" />
          <div>
            <p className="text-sm text-gray-500">Total Workers</p>
            <p className="font-bold">{workers.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-3">
          <UserCheck className="text-green-600" />
          <div>
            <p className="text-sm text-gray-500">Active</p>
            <p className="font-bold">
              {workers.filter((w) => w.status === "Active").length}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow flex items-center gap-3">
          <Briefcase className="text-purple-600" />
          <div>
            <p className="text-sm text-gray-500">Roles</p>
            <p className="font-bold">{new Set(workers.map((w) => w.role)).size}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-1/3">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="All">All Roles</option>
          {roles.map((role, i) => (
            <option key={i} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkers.map((worker) => (
              <tr key={worker.id} className="border-t">
                <td className="px-4 py-3">{worker.name}</td>
                <td className="px-4 py-3">{worker.role}</td>
                <td className="px-4 py-3">{worker.email}</td>
                <td className="px-4 py-3">{worker.phone}</td>
                <td className="px-4 py-3">{worker.joined}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      worker.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {worker.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right flex gap-2 justify-end">
                  <button
                    onClick={() => handleEdit(worker)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(worker.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredWorkers.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-500">
                  No workers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">
              {editingWorker ? "Edit Worker" : "Add Worker"}
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="border rounded-lg px-3 py-2"
              >
                <option value="">Select Role</option>
                {roles.map((role, i) => (
                  <option key={i} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <input
                type="text"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <input
                type="date"
                value={formData.joined}
                onChange={(e) => setFormData({ ...formData, joined: e.target.value })}
                className="border rounded-lg px-3 py-2"
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="border rounded-lg px-3 py-2"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingWorker(null);
                  resetForm();
                }}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOrUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingWorker ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


