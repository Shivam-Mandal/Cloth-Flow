import React from 'react';
import { useUser } from '../context/UserContext';
import InventoryWorkspace from '../inventory/InventoryWorkspace';

export default function WorkerInventoryManagement() {
  const { user } = useUser();
  const workerType = String(user?.workerType || '').toLowerCase();

  if (workerType !== 'inventory') {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-8 text-amber-800">
        Inventory management is available only for inventory workers.
      </div>
    );
  }

  return (
    <InventoryWorkspace
      title="Inventory workspace"
      description="Inventory workers can manage ready stock, update reservation and dispatch status, and keep finished inventory moving accurately."
      canManage
    />
  );
}
