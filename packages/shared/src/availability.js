// Evaluates whether an AED is available right now, based on its weekly
// schedule (weekday-keyed "0".."6", Sun-Sat) and manual isAvailable/is24h flags.
export function evaluateAvailability(location) {
  // Explicitly deactivated (e.g., broken, maintenance)
  if (!location.isAvailable) return false;

  if (location.is24h) return true;

  if (!location.schedule) return false;

  const now = new Date();
  const currentDay = String(now.getDay());
  const todaySchedule = location.schedule[currentDay];

  if (!todaySchedule || todaySchedule.length === 0) return false;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const timeValue = currentHour * 60 + currentMinute;

  return todaySchedule.some((slot) => {
    const [openH, openM] = slot.open.split(':').map(Number);
    const openValue = openH * 60 + openM;

    const [closeH, closeM] = slot.close.split(':').map(Number);
    const closeValue = closeH * 60 + closeM;

    return timeValue >= openValue && timeValue <= closeValue;
  });
}

export function formatSchedule(daySchedule) {
  if (!daySchedule || daySchedule.length === 0) return 'Closed';
  return daySchedule.map((slot) => `${slot.open} - ${slot.close}`).join(', ');
}
