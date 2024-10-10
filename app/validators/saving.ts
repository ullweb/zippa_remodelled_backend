import vine from '@vinejs/vine'

export const autosaveValidator = vine.compile(
  vine.object({
    title: vine.string(),
    amount: vine.number(),
    endDate: vine.string(),
    frequency: vine.string(),
    per: vine.number(),
    timeOfDay: vine.string().optional().requiredWhen('frequency', '=', 'daily'),
    dayOfWeek: vine.number().optional().requiredWhen('frequency', '=', 'weekly'),
    dayOfMonth: vine.number().optional().requiredWhen('frequency', '=', 'monthly'),
    startDate: vine.string(),
  })
)
