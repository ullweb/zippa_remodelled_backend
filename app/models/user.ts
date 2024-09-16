import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import Wallet from './wallet.js'
import Bill from './bill.js'
import Deposit from './deposit.js'
import Transaction from './transaction.js'
import Card from './card.js'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare address: string | null

  @column()
  declare email: string

  @column()
  declare phone: string

  @column()
  declare dob: string

  @column()
  declare idNumber: string

  @column()
  declare idType: string

  @column()
  declare bvnVerified: boolean

  @column()
  declare username: string

  @column()
  declare balance: number

  @column()
  declare pin: string | null

  @column()
  declare verified: boolean

  @column()
  declare verificationCode: number | null

  @column()
  declare passwordResetCode: number | null

  @column()
  declare status: 'active' | 'inactive'

  @column()
  declare role: 'user' | 'admin'

  @column()
  declare image: string

  @column({ serializeAs: null })
  declare password: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  static readonly accessTokens = DbAccessTokensProvider.forModel(User)

  @hasMany(() => Bill)
  declare bills: HasMany<typeof Bill>

  @hasMany(() => Deposit)
  declare deposits: HasMany<typeof Deposit>

  @hasMany(() => Transaction)
  declare transactions: HasMany<typeof Transaction>

  @hasMany(() => Card)
  declare cards: HasMany<typeof Card>

  @hasOne(() => Wallet)
  declare wallet: HasOne<typeof Wallet>
}
