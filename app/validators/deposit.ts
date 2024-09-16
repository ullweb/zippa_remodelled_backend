import vine from '@vinejs/vine'

export const initiateValidator = vine.compile(
  vine.object({
    ref: vine.number(),
    amount: vine.number(),
  })
)

export const verifyValidator = vine.compile(
  vine.object({
    id: vine.number(),
  })
)
