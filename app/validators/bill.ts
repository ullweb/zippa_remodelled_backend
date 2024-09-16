import vine from '@vinejs/vine'
export const airtimeValidator = vine.compile(
  vine.object({
    amount: vine.number(),
    phone: vine.string().minLength(11),
    method: vine.string(),
    id: vine.number(),
    email: vine.string().email().normalizeEmail(),
    name: vine.string(),
    network: vine.string(),
  })
)

export const dataValidator = vine.compile(
  vine.object({
    amount: vine.number(),
    phone: vine.string().minLength(11),
    method: vine.string(),
    id: vine.number(),
    email: vine.string().email().normalizeEmail(),
    name: vine.string(),
    billersCode: vine.string(),
    serviceID: vine.string(),
    variation_code: vine.string(),
  })
)

export const customerValidator = vine.compile(
  vine.object({
    billersCode: vine.string(),
    serviceID: vine.string(),
  })
)

export const cableValidator = vine.compile(
  vine.object({
    amount: vine.number(),
    phone: vine.string().minLength(11),
    method: vine.string(),
    id: vine.number(),
    email: vine.string().email().normalizeEmail(),
    name: vine.string(),
    billersCode: vine.string(),
    serviceID: vine.string(),
    variation_code: vine.string(),
    change: vine.string(),
  })
)

export const meterValidator = vine.compile(
  vine.object({
    billersCode: vine.string(),
    serviceID: vine.string(),
    type: vine.string(),
  })
)
