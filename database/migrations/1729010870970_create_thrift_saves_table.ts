import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'thrift_saves'

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

      table.string('title')
      table.integer('amount')
      table.string('frequency', 50)
      table.string('start_date', 50)
      table.integer('per')
      table.integer('interest')
      table.string('cron', 50)
      table.enum('status', ['ongoing', 'completed'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
