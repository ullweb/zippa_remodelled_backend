import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bills'

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

      table.string('type', 20)
      table.integer('amount')
      table.string('provider', 50)
      table.string('package', 100)
      table.string('recipient', 100)
      table.enum('status', ['success', 'pending', 'failed'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
