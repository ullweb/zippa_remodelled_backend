import vine from '@vinejs/vine'

export const autosaveValidator = vine.compile(
  vine.object({
    title: vine.string(),
    amount: vine.number(),
    endDate: vine.string(),
    frequency: vine.string(),
    per: vine.number(),
    timeOfDay: vine.string(),
    dayOfWeek: vine.number(),
    dayOfMonth: vine.number(),
    startDate: vine.string(),
  })
)
