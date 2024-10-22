import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'kiddies'

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
      table.enum('plan', ['Smart 100', 'Smart 50', 'Smart 30', 'Smart 20'])
      table.integer('amount')
      table.integer('current')
      table.string('start_date', 50)
      table.string('end_date', 50)
      table.string('benefits')
      table.boolean('registered')
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
