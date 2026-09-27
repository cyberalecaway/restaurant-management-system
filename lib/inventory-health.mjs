export function getInventoryStatus({ quantityOnHand, minimumLevel, reorderLevel }) {
  const quantity = Number(quantityOnHand);
  const minimum = Number(minimumLevel);
  const reorder = Number(reorderLevel);
  if (![quantity, minimum, reorder].every(Number.isFinite) || quantity < 0 || minimum < 0 || reorder < minimum) {
    return { label: 'UNKNOWN', key: 'unknown' };
  }
  if (quantity <= 0) return { label: 'OUT OF STOCK', key: 'out' };
  if (quantity <= minimum) return { label: 'CRITICAL', key: 'critical' };
  if (quantity <= reorder) return { label: 'LOW', key: 'low' };
  return { label: 'IN STOCK', key: 'ok' };
}
