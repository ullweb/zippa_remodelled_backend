import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class Bill extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare reference: string

  @column()
  declare type: string

  @column()
  declare amount: number

  @column()
  declare provider: string

  @column()
  declare package: string

  @column()
  declare recipient: string

  @column()
  declare status: 'success' | 'pending' | 'failed'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  // @belongsTo(() => Wallet)
  // declare wallet: BelongsTo<typeof Wallet>
}
