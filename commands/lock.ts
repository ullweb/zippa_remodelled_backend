import FixedLock from '#models/fixed_lock'
import Transaction from '#models/transaction'
import User from '#models/user'
import Wallet from '#models/wallet'
import { sendMail } from '#services/sendmail_service'
import { args, BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { compareAsc, startOfDay, startOfToday } from 'date-fns'

export default class Lock extends BaseCommand {
  static commandName = 'lock'
  static description = ''

  static options: CommandOptions = {}
  @args.string()
  declare id: string
  async run() {
    this.logger.info('Hello world from "Lock"')
    try {
      const fixed = await FixedLock.find(this.id)
      if (!fixed) {
        return this.logger.error(`Fixed locked for id: ${this.id} not found`)
      }
      // const { fixedId, userId, email, name, endDateObj } = job.attrs.data
      const currentDate = startOfToday()
      const end = startOfDay(new Date(fixed.endDate))
      // const fixed = await FixedLock.findOne({ _id: fixedId })
      const compare = compareAsc(currentDate, end)
      if (compare === 1) {
        const wallet = await Wallet.findBy({ userId: fixed.userId })

        if (!wallet) {
          return this.logger.error(`No Wallet found for id: ${fixed.userId}`)
        }
        const user = await User.find(fixed.userId)

        if (!user) {
          return this.logger.error(`No User found for id: ${fixed.userId}`)
        }
        wallet.walletBalance = fixed.amount + fixed.interest
        await Transaction.create({
          userId: fixed.userId,
          amount: fixed.amount,
          title: `Fixed Lock - ${fixed.title}`,
          type: 'credit',
          status: 'success',
        })
        await Transaction.create({
          userId: fixed.userId,
          amount: fixed?.interest,
          title: `Fixed Lock - ${fixed?.title} interest`,
          type: 'credit',
          status: 'success',
        })
        fixed.status = 'completed'
        fixed.paidBack = fixed.amount + fixed.interest

        sendMail(
          {
            subject: 'Zippa Benefit Completed',
            message: `
              <p>You have successfully completed your  ${fixed.title} fixed lock</p>
              <p>You have earned ₦${fixed.interest} interest on your savings credited to your account</p>
              <p>₦${fixed.amount + fixed.interest} has been credited to your Wallet</p>
              <br />
              <br />
              <h3>Thank you for choosing Zippa</h3>
              `,
          },
          user
        )
        // await sendFixedLockCompleteEmail({
        //   email,
        //   title: fixed?.title,
        //   amount: +fixed?.amount + +fixed?.interest,
        //   interest: +fixed?.interest,
        // })
        // await job.remove()
        await wallet.save()
        await fixed.save()
        this.logger.info(`Job removed for completed fixedLock: ${this.id}`)
      }
    } catch (error) {
      this.logger.error(`Error processing fixedLock job: ${error.message}`)
    }
  }
}
