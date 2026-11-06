// "Today" as "YYYY-MM-DD" in the student's time zone (en-CA formats dates as YYYY-MM-DD).
// Due dates and exam dates are stored this way, so string comparison works.
function todayIn(timezone = 'Asia/Kolkata', now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

module.exports = { todayIn }
