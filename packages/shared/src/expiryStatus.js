const CRITICAL_DAYS = 30;
const WARNING_DAYS = 90;

// Day-count/color-tier classification for AED hardware expiration dates
// (battery, pads, next inspection due). Thresholds are defined once here so
// the admin UI's badges stay consistent everywhere they're used.
export function expiryStatus(dateInput) {
  if (!dateInput) {
    return { level: 'unknown', color: 'grey-6', label: 'Not set', daysUntil: null };
  }

  const date = new Date(dateInput);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntil = Math.ceil((date.getTime() - now.getTime()) / msPerDay);

  if (daysUntil < 0) {
    return { level: 'critical', color: 'negative', label: `Expired ${Math.abs(daysUntil)}d ago`, daysUntil };
  }
  if (daysUntil < CRITICAL_DAYS) {
    return { level: 'critical', color: 'negative', label: `${daysUntil}d left`, daysUntil };
  }
  if (daysUntil < WARNING_DAYS) {
    return { level: 'warning', color: 'warning', label: `${daysUntil}d left`, daysUntil };
  }
  return { level: 'ok', color: 'positive', label: `${daysUntil}d left`, daysUntil };
}
