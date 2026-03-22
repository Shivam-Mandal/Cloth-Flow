import React from 'react';
import InventoryWorkspace from '../inventory/InventoryWorkspace';

export default function InventoryManagement() {
  return (
    <InventoryWorkspace
      title="Admin inventory control for packed and sale-out stock"
      description="Admin can monitor finished inventory, update stock movement, reserve items, dispatch orders, and track every inventory change on each suborder."
      canManage
    />
  );
}
