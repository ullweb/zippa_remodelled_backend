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
        console.log(match)
        return !!match
      }),
    name: vine.string(),
    phone: vine.string().minLength(11),
    password,
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
