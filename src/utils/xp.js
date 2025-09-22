export function progressBar(current, target, size = 20) {
  const pct = Math.max(0, Math.min(1, target > 0 ? current / target : 0));
  const filled = Math.round(pct * size);
  return `【${'▓'.repeat(filled)}${'░'.repeat(size - filled)}】 ${(pct * 100).toFixed(0)}%`;
}


