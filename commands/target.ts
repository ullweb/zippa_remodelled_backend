import Autosave from '#models/autosave'
import Transaction from '#models/transaction'
import User from '#models/user'
import Wallet from '#models/wallet'
import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class Target extends BaseCommand {
  static commandName = 'target'
  static description = 'Run Auto Saves at a specific time'

  static options: CommandOptions = {}
  @args.string()
  declare id: string
  async run() {
    const auto = await Autosave.find(this.id)
    if (auto) {
      const user = await User.find(auto.userId)
      const wallet = await Wallet.findBy({ userId: user?.id })
      if (wallet && user) {
        if (auto.current === auto.amount) {
          wallet.walletBalance += auto.interest
          await Transaction.create({
            userId: user.id,
            amount: auto?.interest,
            title: `${auto.title} AutoSave Interest`,
            type: 'credit',
            status: 'success',
          })
          this.logger.info('Auto Save Interest Paid Successfully')
          return
        }
        // Deduct the per amount from the wallet
        if (wallet.walletBalance >= auto.per) {
          wallet.walletBalance -= auto.per
          auto.current += auto.per
          await Transaction.create({
            userId: user.id,
            amount: auto?.per,
            title: `${auto.title} AutoSave`,
            type: 'debit',
            status: 'success',
          })
        } else {
          await Transaction.create({
            userId: user.id,
            amount: auto.per,
            title: `${auto.title} AutoSave`,
            type: 'debit',
            status: 'failed',
          })
          // await sendFailedWalletDebitEmail({
          //   email,
          //   title: `${auto.title} AutoSave`,
          //   amount: auto?.per,
          // })
        }
        await wallet.save()
        await user.save()
      }
      await auto.save()
    }

    // console.log(wallet)
    // this.logger.info('Hello world from "Target"')
  }
}
