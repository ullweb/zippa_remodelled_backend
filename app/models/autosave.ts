import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Autosave extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare title: string

  @column()
  declare amount: number

  @column()
  declare current: number

  @column()
  declare startDate: Date

  @column()
  declare endDate: Date

  @column()
  declare frequency: string

  @column()
  declare cron: string

  @column()
  declare per: number

  @column()
  declare interest: number

  @column()
  declare status: 'ongoing' | 'completed'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
