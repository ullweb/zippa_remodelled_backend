import vine from '@vinejs/vine'

export const topupFlexValidator = vine.compile(
  vine.object({
    amount: vine.number(),
  })
)
export const fixedLockValidator = vine.compile(
  vine.object({
    amount: vine.number(),
    title: vine.string(),
  })
)
export const benefitValidator = vine.compile(
  vine.object({
    plan: vine.string(),
    startDate: vine.string(),
    dayOfMonth: vine.number(),
  })
)
export const thriftSaveValidator = vine.compile(
  vine.object({
    title: vine.string(),
    frequency: vine.string(),
    per: vine.number(),
    startDate: vine.string(),
    timeOfDay: vine.string(),
    dayOfWeek: vine.number(),
    dayOfMonth: vine.number(),
  })
)
