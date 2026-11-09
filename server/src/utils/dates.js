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

// How far the zone is ahead of UTC at `date`, in milliseconds (IST is +5:30)
function zoneOffsetMs(timezone, date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  )
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

// The exact moment today began (local midnight) in the student's time zone, as a Date.
// Used to count "reviews done today" from Review.reviewedAt.
function startOfTodayIn(timezone = 'Asia/Kolkata', now = new Date()) {
  const [y, m, d] = todayIn(timezone, now).split('-').map(Number)
  const midnightAsUtc = Date.UTC(y, m - 1, d)
  // Apply the offset twice so days when clocks change (DST) still land on midnight
  const guess = midnightAsUtc - zoneOffsetMs(timezone, new Date(midnightAsUtc))
  return new Date(midnightAsUtc - zoneOffsetMs(timezone, new Date(guess)))
}

// "YYYY-MM-DD" plus n calendar days (dates only, so time zones cannot shift it)
function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

module.exports = { todayIn, startOfTodayIn, addDays }
