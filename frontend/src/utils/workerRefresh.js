export const WORKER_DATA_REFRESH_EVENT = 'worker:data-refresh';

export const emitWorkerDataRefresh = (detail = {}) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(WORKER_DATA_REFRESH_EVENT, {
      detail: {
        source: 'worker-ui',
        timestamp: Date.now(),
        ...detail
      }
    })
  );
};

export const subscribeWorkerDataRefresh = (handler) => {
  if (typeof window === 'undefined') return () => {};

  const wrapped = (event) => {
    handler(event?.detail || {});
  };

  window.addEventListener(WORKER_DATA_REFRESH_EVENT, wrapped);
  return () => window.removeEventListener(WORKER_DATA_REFRESH_EVENT, wrapped);
};
