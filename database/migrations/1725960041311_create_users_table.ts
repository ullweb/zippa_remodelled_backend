import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table.string('name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()
      table.string('address').nullable()
      table.string('phone', 20).notNullable()
      table.string('dob', 15).nullable()
      table.string('id_number', 50).nullable()
      table.string('id_type', 30).nullable()
      table.string('username', 200).notNullable().unique()
      table.integer('balance').defaultTo(0)
      table.string('pin', 255).nullable()
      table.boolean('verified').defaultTo(false)
      table.integer('verification_code').nullable()
      table.integer('password_reset_code').nullable()
      table.boolean('bvn_verified').defaultTo(false)
      table.enum('status', ['active', 'inactive']).defaultTo('active')
      table.enum('role', ['user', 'admin']).defaultTo('user')
      table.string('image').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
