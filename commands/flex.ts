import FlexSave from '#models/flex_save'
import Transaction from '#models/transaction'
import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class Flex extends BaseCommand {
  static commandName = 'flex'
  static description = ''

  static readonly options: CommandOptions = {}
  @args.string()
  declare userId: string

  async run() {
    this.logger.info('Hello world from "Flex"')
    try {
      const userId = Number.parseInt(this.userId)
      const flex = await FlexSave.findBy({ userId })
      if (flex) {
        const interest = flex.amount * 0.015
        const newAmount = flex.amount + interest
        flex.amount = newAmount
        await flex?.save()

        await Transaction.create({
          userId,
          amount: interest,
          title: `Flex Interest`,
          type: 'credit',
          status: 'success',
        })
      }
    } catch (error) {
      this.logger.error(`Error processing thrift job: ${error.message}`)
    }
  }
}
