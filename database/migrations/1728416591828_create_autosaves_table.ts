import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'autosaves'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('user_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('title', 200)
      table.integer('amount')
      table.integer('current')
      table.date('start_date')
      table.date('end_date')
      table.string('frequency')
      table.string('cron', 200)
      table.integer('per')
      table.integer('interest')
      table.enum('status', ['ongoing', 'completed'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
