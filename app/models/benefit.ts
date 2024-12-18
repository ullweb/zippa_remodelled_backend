import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Benefit extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare plan: 'Diamond' | 'Gold' | 'Silver' | 'Bronze'

  @column()
  declare amount: number

  @column()
  declare current: number

  @column()
  declare startDate: string

  @column()
  declare endDate: string

  @column()
  declare benefits: string

  @column()
  declare debitAttemptCount: number

  @column()
  declare status: 'completed' | 'ongoing' | 'failed'

  @column()
  declare registered: boolean

  @column()
  declare cron: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
