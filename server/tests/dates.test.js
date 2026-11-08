const { todayIn, startOfTodayIn } = require('../src/utils/dates')

describe('todayIn', () => {
  it('uses the student\'s time zone, not UTC', () => {
    // 20:00 UTC on 7 Nov is already 01:30 on 8 Nov in India
    const now = new Date('2026-11-07T20:00:00Z')
    expect(todayIn('Asia/Kolkata', now)).toBe('2026-11-08')
    expect(todayIn('America/New_York', now)).toBe('2026-11-07')
  })
})

describe('startOfTodayIn', () => {
  it('returns local midnight as a UTC instant', () => {
    const now = new Date('2026-11-08T10:00:00Z')
    expect(startOfTodayIn('Asia/Kolkata', now).toISOString()).toBe('2026-11-07T18:30:00.000Z')
    expect(startOfTodayIn('UTC', now).toISOString()).toBe('2026-11-08T00:00:00.000Z')
  })

  it('handles a day when clocks change', () => {
    // US clocks went back on 1 Nov 2026; midnight that day was still EDT (UTC-4)
    const now = new Date('2026-11-01T18:00:00Z')
    expect(startOfTodayIn('America/New_York', now).toISOString()).toBe('2026-11-01T04:00:00.000Z')
  })
})
