const colorMap = {
  black: '#111827',
  blue: '#2563eb',
  green: '#16a34a',
  orange: '#f97316',
  purple: '#7c3aed',
  red: '#ef4444',
  white: '#ffffff',
  yellow: '#eab308',
  navy: '#1e3a8a',
  pink: '#ec4899',
  gray: '#6b7280',
  grey: '#6b7280',
  brown: '#78350f',
  beige: '#f5f5dc',
  maroon: '#800000',
  cyan: '#06b6d4',
  teal: '#0d9488',
  indigo: '#4f46e5',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  emerald: '#10b981',
  sky: '#0284c7'
};

const getColorHex = (name) => {
  if (!name || name === '—') return null;
  const key = String(name).trim().toLowerCase();
  if (colorMap[key]) return colorMap[key];
  if (/^#([0-9a-f]{3}){1,2}$/i.test(key)) return key;
  if (/^rgb/i.test(key)) return key;
  return key;
};

const ColorBadge = ({ color }) => {
  if (!color || color === '—') return <span>—</span>;
  const hex = getColorHex(color);
  const isLight = hex && (hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === 'white' || hex.toLowerCase() === '#f8fafc');

  return (
    <div className="inline-flex items-center gap-1.5 font-medium">
      {hex && (
        <span
          className={`h-3 w-3 rounded-full shrink-0 ${
            isLight ? 'border border-gray-300' : 'border border-black/10'
          }`}
          style={{ backgroundColor: hex }}
          title={color}
        />
      )}
      <span>{color}</span>
    </div>
  );
};

const extractCompletedWorkDetails = (work) => {
  let color = '—';
  let size = '—';

  try {
    if (work && work.pieces && typeof work.pieces === 'object' && !Array.isArray(work.pieces)) {
      const colors = Object.keys(work.pieces);
      if (colors.length > 0) {
        color = colors[0];
        const sizesObj = work.pieces[color] || {};
        const sizes = Object.keys(sizesObj);
        if (sizes.length > 0) size = sizes.join(', ');
      }
    } else if (Array.isArray(work?.pieces) && work.pieces.length > 0) {
      const p = work.pieces[0];
      color = p.color ?? p.colour ?? p.colorName ?? '—';
      size = p.size ?? p.sizeName ?? '—';
    } else if (work?.color) {
      color = work.color;
      size = work?.size || '—';
    } else if (typeof work?.name === 'string') {
      const parts = work.name.split('-');
      if (parts.length >= 3) {
        color = parts[1].trim();
        size = parts[2].trim();
      } else if (parts.length === 2) {
        color = parts[1].trim();
      }
    }
  } catch {
    // ignore
  }

  const styleName = work?.order?.style?.name
    || work?.order?.styleSnapshot?.name
    || work?.styleName
    || (typeof work?.name === 'string' && work.name.includes('-') ? work.name.split('-')[0] : work?.name)
    || '—';

  const fabricName = work?.order?.fabric
    || work?.order?.styleSnapshot?.fabric
    || work?.order?.style?.fabric
    || work?.fabric
    || '—';

  const orderId = work?.order?.orderId || work?.orderId || '—';
  const subOrderCode = work?.subOrderCode || work?.code || (work?._id ? String(work._id).slice(-6) : '—');
  const stage = work?.currentStage || work?.stage || '—';

  const completedPcs = work?.completedPieces ?? work?.approvedPieces ?? 0;
  const damagedPcs = work?.damagedPieces ?? work?.faultyPieces ?? 0;

  let totalTargetPcs = work?.totalPieces ?? work?.targetPieces ?? work?.totalPlannedPieces ?? 0;
  if (!totalTargetPcs && work?.pieces) {
    if (typeof work.pieces === 'number' && work.pieces > 0) {
      totalTargetPcs = work.pieces;
    } else if (Array.isArray(work.pieces) && work.pieces.length > 0) {
      totalTargetPcs = work.pieces.reduce((acc, p) => acc + Number(p.count ?? p.qty ?? p.quantity ?? p.pieces ?? 0), 0);
    } else if (typeof work.pieces === 'object') {
      let sum = 0;
      for (const col of Object.keys(work.pieces)) {
        const sizes = work.pieces[col];
        if (typeof sizes === 'number') sum += sizes;
        else if (sizes && typeof sizes === 'object') {
          for (const s of Object.keys(sizes)) {
            sum += Number(sizes[s]) || 0;
          }
        }
      }
      if (sum > 0) totalTargetPcs = sum;
    }
  }

  if (!totalTargetPcs && typeof work?.submittedPieces === 'number' && work.submittedPieces > 0) {
    totalTargetPcs = work.submittedPieces;
  }

  if (!totalTargetPcs && (completedPcs + damagedPcs) > 0) {
    totalTargetPcs = completedPcs + damagedPcs;
  }

  const donePcsDisplay = totalTargetPcs > 0 ? `${completedPcs} / ${totalTargetPcs}` : `${completedPcs}`;

  const earnings = work?.amount ?? work?.calculatedPayment ?? 0;
  const dateStr = work?.updatedAt || work?.approvedAt || work?.createdAt
    ? new Date(work.updatedAt || work.approvedAt || work.createdAt).toLocaleDateString()
    : '—';

  return {
    color: String(color),
    size: String(size),
    styleName,
    fabricName,
    orderId,
    subOrderCode,
    stage,
    completedPcs,
    totalTargetPcs,
    donePcsDisplay,
    damagedPcs,
    earnings,
    dateStr
  };
};

export const WorkerCompletedWork = () => {
  const [completedWork, setCompletedWork] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    workCount: 0,
    averagePerTask: 0
  });

  const loadCompletedWork = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorkerCompletedWork();
      setCompletedWork(res.completedWork || []);
      setStats({
        totalEarnings: res.totalEarnings || 0,
        workCount: res.workCount || 0,
        averagePerTask: res.workCount > 0 ? (res.totalEarnings || 0) / res.workCount : 0
      });
    } catch (e) {
      console.error('Failed to load completed work', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load completed work');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompletedWork();

    const handleGlobalRefresh = () => {
      loadCompletedWork();
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => window.removeEventListener('app:refresh', handleGlobalRefresh);
  }, []);

  const {
    currentPage,
    totalPages,
    totalItems,
    pageSize,
    paginatedItems,
    handlePageChange
  } = useClientPagination(completedWork, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Completed Work</h1>
          <p className="text-gray-600 mt-1">Approved work and earnings</p>
        </div>
        <button
          type="button"
          onClick={loadCompletedWork}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <IndianRupee className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{stats.totalEarnings.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Completed Tasks</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.workCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Average per Task</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">₹{stats.averagePerTask.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{String(error)}</div>}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <div className="text-sm text-gray-500">Loading completed work...</div>
          </div>
        ) : completedWork.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No completed work yet</p>
            <p className="text-sm text-gray-500 mt-1">Your approved work will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Work History</h3>
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="px-3 py-3">SubOrder</th>
                    <th className="px-3 py-3">Order ID</th>
                    <th className="px-3 py-3">Style</th>
                    <th className="px-3 py-3">Fabric</th>
                    <th className="px-3 py-3 text-center">Done Pcs</th>
                    <th className="px-3 py-3 text-center">Total Pcs</th>
                    <th className="px-3 py-3 text-center">Damaged</th>
                    <th className="px-3 py-3">Color</th>
                    <th className="px-3 py-3">Size</th>
                    <th className="px-3 py-3">Completed On</th>
                    <th className="px-3 py-3 text-right">Earnings</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {paginatedItems.map((work) => {
                    const details = extractCompletedWorkDetails(work);
                    return (
                      <tr key={work._id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-3 py-3 font-mono font-medium text-gray-900">{details.subOrderCode}</td>
                        <td className="px-3 py-3 font-medium text-gray-800">{details.orderId}</td>
                        <td className="px-3 py-3 font-medium text-gray-900">{details.styleName}</td>
                        <td className="px-3 py-3 text-gray-700">{details.fabricName}</td>
                        <td className="px-3 py-3 text-center font-semibold text-gray-900">{details.completedPcs}</td>
                        <td className="px-3 py-3 text-center font-semibold text-gray-900">{details.totalTargetPcs}</td>
                        <td className="px-3 py-3 text-center text-red-600 font-medium">{details.damagedPcs}</td>
                        <td className="px-3 py-3">
                          <ColorBadge color={details.color} />
                        </td>
                        <td className="px-3 py-3 text-gray-700">{details.size}</td>
                        <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{details.dateStr}</td>
                        <td className="px-3 py-3 text-right font-bold text-green-600">
                          +₹{Number(details.earnings).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            Approved
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          itemLabel="completed tasks"
        />
      </div>

      <div className="flex justify-center">
        <button
          onClick={loadCompletedWork}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default WorkerCompletedWork;
