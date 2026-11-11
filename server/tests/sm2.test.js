const { schedule } = require('../src/services/sm2')

const NEW = { easeFactor: 2.5, intervalDays: 0, repetitions: 0 }
const TODAY = '2026-11-09'

describe('SM-2 schedule', () => {
  it('shows a new card again after 1 day, then 6 days, then interval x ease', () => {
    const first = schedule(NEW, 'good', TODAY)
    expect(first).toMatchObject({ intervalDays: 1, repetitions: 1, dueDate: '2026-11-10', isNewCard: false })

    const second = schedule(first, 'good', TODAY)
    expect(second).toMatchObject({ intervalDays: 6, repetitions: 2, dueDate: '2026-11-15' })

    const third = schedule(second, 'good', TODAY)
    expect(third).toMatchObject({ intervalDays: 15, repetitions: 3 }) // round(6 x 2.5)
  })

  it('changes the ease by rating: easy +0.1, good 0, hard -0.14', () => {
    expect(schedule(NEW, 'easy', TODAY).easeFactor).toBe(2.6)
    expect(schedule(NEW, 'good', TODAY).easeFactor).toBe(2.5)
    expect(schedule(NEW, 'hard', TODAY).easeFactor).toBe(2.36)
  })

  it('resets the card on again, keeps the ease, and shows it tomorrow', () => {
    const learned = { easeFactor: 2.2, intervalDays: 20, repetitions: 5 }
    expect(schedule(learned, 'again', TODAY)).toEqual({
      easeFactor: 2.2,
      intervalDays: 1,
      repetitions: 0,
      dueDate: '2026-11-10',
      isNewCard: false,
    })
  })

  it('never lets the ease drop below 1.3', () => {
    let state = { easeFactor: 1.4, intervalDays: 10, repetitions: 3 }
    for (let i = 0; i < 5; i++) state = schedule(state, 'hard', TODAY)
    expect(state.easeFactor).toBe(1.3)
  })

  it('crosses month and year ends correctly', () => {
    const card = { easeFactor: 2.5, intervalDays: 6, repetitions: 2 }
    expect(schedule(card, 'good', '2026-12-25').dueDate).toBe('2027-01-09')
  })

  it('rejects an unknown rating', () => {
    expect(() => schedule(NEW, 'perfect', TODAY)).toThrow('Unknown rating')
  })
})
