const BYTE_UNIT = 1024;

export const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;

  while (bytes >= BYTE_UNIT && i < units.length - 1) {
    bytes /= BYTE_UNIT;
  }

  const value = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(bytes);

  return `${value} ${units[i]}`;
};
