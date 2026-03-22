const DEFAULT_STAGE_SEQUENCE = ['Cutting', 'Printing', 'Stitching', 'Finishing', 'Packing'];
export const INVENTORY_WORKER_TYPE = 'Inventory';

export const normalizeStageLabel = (value = '') =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

export const normalizeStageKey = (value = '') =>
  normalizeStageLabel(value).toLowerCase();

export const getStyleStages = (style = {}) => {
  const labels = Array.isArray(style?.steps)
    ? style.steps
        .map((step) => normalizeStageLabel(step?.label))
        .filter(Boolean)
    : [];

  if (labels.length > 0) {
    return [...new Set(labels)];
  }

  return DEFAULT_STAGE_SEQUENCE;
};

export const getOrderStages = (order = {}, fallbackStyle = null) => {
  const orderStages = Array.isArray(order?.stages)
    ? order.stages.map(normalizeStageLabel).filter(Boolean)
    : [];

  if (orderStages.length > 0) {
    return [...new Set(orderStages)];
  }

  if (fallbackStyle) {
    return getStyleStages(fallbackStyle);
  }

  return DEFAULT_STAGE_SEQUENCE;
};

export const getFirstStage = (order = {}, fallbackStyle = null) => getOrderStages(order, fallbackStyle)[0] || null;

export const getNextStage = (order = {}, currentStage = '', fallbackStyle = null) => {
  const stages = getOrderStages(order, fallbackStyle);
  const currentIndex = stages.findIndex((stage) => normalizeStageKey(stage) === normalizeStageKey(currentStage));
  if (currentIndex === -1 || currentIndex >= stages.length - 1) {
    return null;
  }
  return stages[currentIndex + 1];
};

export const isLastStage = (order = {}, currentStage = '', fallbackStyle = null) => {
  const stages = getOrderStages(order, fallbackStyle);
  if (stages.length === 0) return false;
  return normalizeStageKey(stages[stages.length - 1]) === normalizeStageKey(currentStage);
};

export const getAvailableWorkerTypes = (styles = []) => {
  const stageLabels = styles.flatMap((style) => getStyleStages(style));
  return [...new Set([...stageLabels, INVENTORY_WORKER_TYPE])];
};

export const isInventoryWorkerType = (workerType = '') =>
  normalizeStageKey(workerType) === normalizeStageKey(INVENTORY_WORKER_TYPE);
