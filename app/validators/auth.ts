import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
const password = vine.string().minLength(8)
const email = vine.string().email().normalizeEmail()
export const registerValidator = vine.compile(
  vine.object({
    email: vine
      .string()
      .email()
      .normalizeEmail()
      .unique(async (db, value) => {
        const match = await db.from('users').select('id').where('email', value)
        return !!match
      }),
    name: vine.string(),
    phone: vine.string().minLength(11),
    password,
    username: vine.string().unique(async(db, value) => {
      const match = await db.from('users').select('id').where('username', value)
        return !!match
    })
    // confirm,
  })
)

export const emailValidator = vine.compile(
  vine.object({
    email,
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email,
    password,
  })
)

export const verifyValidator = vine.compile(
  vine.object({
    email,
    code: vine.number(),
  })
)

export const bvnValidator = vine.compile(
  vine.object({
    bvn: vine.number(),
  })
)

export const updatePinValidator = vine.compile(
  vine.object({
    oldPin: vine.string(),
    newPin: vine.string(),
  })
)
export const accountValidator = vine.compile(
  vine.object({
    email: vine
      .string()
      .email()
      .optional()
      .requiredIfMissing(['username', 'dob', 'address', 'phone']),
    username: vine.string().optional().requiredIfMissing(['email', 'dob', 'address', 'phone']),
    dob: vine.string().optional().requiredIfMissing(['username', 'email', 'address', 'phone']),
    address: vine.string().optional().requiredIfMissing(['username', 'dob', 'email', 'phone']),
    phone: vine.string().optional().requiredIfMissing(['username', 'dob', 'address', 'email']),
  })
)
