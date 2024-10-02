import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'deposits'

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
      // table
      //   .integer('wallet_id')
      //   .notNullable()
      //   .unsigned()
      //   .references('id')
      //   .inTable('wallets')
      //   .onDelete('CASCADE')

      table.integer('amount')
      table.string('reference_id')
      table.enum('status', ['success', 'pending', 'failed'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
