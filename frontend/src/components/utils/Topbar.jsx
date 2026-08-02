// src/utils/Topbar.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Search, LogOut, User as UserIcon, Settings, ChevronDown, Menu, ShoppingCart, Shirt, Package, Users, LayoutDashboard, CheckCircle, Boxes, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// motion removed
import { useLayout } from '../context/LayoutContext';
import * as orderService from '../services/orderServices';
import * as styleService from '../services/styleServices';
import stockService from '../services/stockServices';
import { fetchUsers } from '../services/userServices';

const staticSearchItems = [
  { id: 'page-overview', type: 'Page', title: 'Overview', subtitle: 'Dashboard summary', path: '/admin', icon: LayoutDashboard },
  { id: 'page-approvals', type: 'Page', title: 'Approvals', subtitle: 'Review pending work approvals', path: '/admin/approvals', icon: CheckCircle },
  { id: 'page-inventory', type: 'Page', title: 'Inventory', subtitle: 'Packed and sale-ready inventory', path: '/admin/inventory', icon: Boxes },
  { id: 'page-styles', type: 'Page', title: 'Style Management', subtitle: 'Create and manage garment styles', path: '/admin/styles', icon: Shirt },
  { id: 'page-stock', type: 'Page', title: 'Stock Management', subtitle: 'Raw cloth inventory', path: '/admin/stock', icon: Package },
  { id: 'page-orders', type: 'Page', title: 'Order Management', subtitle: 'Production orders', path: '/admin/orders', icon: ShoppingCart },
  { id: 'page-users', type: 'Page', title: 'User Management', subtitle: 'Admins and workers', path: '/admin/users', icon: Users },
  { id: 'page-workers', type: 'Page', title: 'Worker Performance', subtitle: 'Worker metrics', path: '/admin/workers', icon: BarChart3 }
];

const normalizeOrdersResponse = (res) => {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.orders)) return data.orders;
  return [];
};

const getStockColor = (color) => {
  if (typeof color === 'string') return color;
  return color?.name || 'Custom';
};

const getSearchText = (item) => [item.title, item.subtitle, item.type].filter(Boolean).join(' ').toLowerCase();

const Topbar = ({ user = {}, onLogout }) => {
  const { toggleSidebar } = useLayout();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchItems, setSearchItems] = useState(staticSearchItems);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLoaded, setSearchLoaded] = useState(false);

  const notifications = [
    { id: 1, title: 'New order received', time: '2 min ago', type: 'order' },
    { id: 2, title: 'Worker completed task', time: '5 min ago', type: 'task' },
    { id: 3, title: 'Stock level low', time: '10 min ago', type: 'warning' },
  ];

  const loadSearchItems = async () => {
    if (searchLoaded || searchLoading) return;

    setSearchLoading(true);
    const [ordersResult, stylesResult, stocksResult, usersResult] = await Promise.allSettled([
      orderService.getOrders(),
      styleService.fetchStyles(),
      stockService.fetchStocks(),
      fetchUsers()
    ]);

    const orders = ordersResult.status === 'fulfilled' ? normalizeOrdersResponse(ordersResult.value) : [];
    const styles = stylesResult.status === 'fulfilled' ? stylesResult.value || [] : [];
    const stocks = stocksResult.status === 'fulfilled' ? stocksResult.value || [] : [];
    const usersPayload = usersResult.status === 'fulfilled' ? usersResult.value : {};
    const users = Array.isArray(usersPayload?.users) ? usersPayload.users : Array.isArray(usersPayload) ? usersPayload : [];

    setSearchItems([
      ...staticSearchItems,
      ...orders.map((order) => ({
        id: `order-${order._id || order.id || order.orderId}`,
        type: 'Order',
        title: order.orderId || 'Order',
        subtitle: [order.styleSnapshot?.name || order.style?.name, order.vendor].filter(Boolean).join(' • ') || 'Production order',
        path: '/admin/orders',
        icon: ShoppingCart
      })),
      ...styles.map((style) => ({
        id: `style-${style._id || style.id || style.name}`,
        type: 'Style',
        title: style.name || 'Untitled style',
        subtitle: [style.skuId, `${(style.steps || []).length} stages`].filter(Boolean).join(' • '),
        path: '/admin/styles',
        icon: Shirt
      })),
      ...stocks.map((stock) => ({
        id: `stock-${stock._id || stock.id}`,
        type: 'Stock',
        title: stock.vendor || 'Stock item',
        subtitle: `${getStockColor(stock.color)} • ${Number(stock.quantityKg) || 0} kg`,
        path: '/admin/stock',
        icon: Package
      })),
      ...users.map((item) => ({
        id: `user-${item._id || item.id || item.email}`,
        type: item.role === 'worker' ? 'Worker' : 'User',
        title: item.name || item.email || 'User',
        subtitle: [item.email, item.workerType || item.worker_type || item.role].filter(Boolean).join(' • '),
        path: item.role === 'worker' ? '/admin/workers' : '/admin/users',
        icon: Users
      }))
    ]);
    setSearchLoaded(true);
    setSearchLoading(false);
  };

  const filteredSearchItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return staticSearchItems.slice(0, 6);

    return searchItems
      .filter((item) => getSearchText(item).includes(query))
      .slice(0, 8);
  }, [searchItems, searchQuery]);

  const groupedSearchItems = useMemo(() => {
    return filteredSearchItems.reduce((groups, item) => {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type].push(item);
      return groups;
    }, {});
  }, [filteredSearchItems]);

  const showSearchResults = searchFocused && (searchQuery.trim() || filteredSearchItems.length > 0);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!searchRef.current?.contains(event.target)) {
        setSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const handleSearchSelect = (item) => {
    navigate(item.path);
    setSearchQuery('');
    setSearchFocused(false);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left Section */}
        <div className="flex min-w-0 flex-1 items-center space-x-4">
          <button 
            onClick={toggleSidebar}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Search Bar */}
          <div className="hidden min-w-0 flex-1 sm:block" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => {
                  setSearchFocused(true);
                  loadSearchItems();
                }}
                placeholder="Search orders, workers, or tasks..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all duration-200"
              />
              {showSearchResults && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                  <div className="max-h-96 overflow-y-auto p-2">
                    {searchLoading ? (
                      <div className="px-3 py-4 text-sm text-gray-500">Loading search...</div>
                    ) : filteredSearchItems.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-500">No results found</div>
                    ) : (
                      Object.entries(groupedSearchItems).map(([group, items]) => (
                        <div key={group} className="py-1">
                          <p className="px-3 py-1 text-[11px] font-bold uppercase text-gray-400">{group}</p>
                          {items.map((item) => {
                            const Icon = item.icon || Search;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSearchSelect(item)}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-50"
                              >
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                  <Icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-gray-900">{item.title}</span>
                                  <span className="block truncate text-xs text-gray-500">{item.subtitle}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          
          {/* Quick Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200">
              <Settings className="w-5 h-5" />
            </button>
          </div>
          
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                {notifications.length}
              </span>
            </button>
            
            {/* Notifications Dropdown */}

              {showNotifications && (
                <div




                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50"
                >
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="p-4 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}

          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <UserIcon className="w-5 h-5 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-xs text-gray-600 capitalize">
                  {user?.role || 'Administrator'}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            
            {/* User Dropdown */}

              {showUserMenu && (
                <div




                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50"
                >
                  <div className="p-3 border-b border-gray-100">
                    <p className="font-medium text-gray-900">{user?.name || 'Admin'}</p>
                    <p className="text-sm text-gray-500">{user?.email || 'Signed in user'}</p>
                  </div>
                  <div className="py-2">
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                      <UserIcon className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                  </div>
                  <div className="border-t border-gray-100 py-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout?.();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}

          </div>
        </div>
      </div>
      
      {/* Click outside to close dropdowns */}
      {(showUserMenu || showNotifications) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
};

export default Topbar;
