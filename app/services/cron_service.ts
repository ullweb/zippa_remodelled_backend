import Autosave from '#models/autosave'
import Transaction from '#models/transaction'
import User from '#models/user'
import Wallet from '#models/wallet'
import logger from '@adonisjs/core/services/logger'
import { sendFailedDebitEmail, sendMail } from './sendmail_service.js'
import Benefit from '#models/benefit'
import Kiddy from '#models/kiddy'
import FixedLock from '#models/fixed_lock'
import { startOfToday, startOfDay, compareAsc } from 'date-fns'
import FlexSave from '#models/flex_save'

export const dailyAutoSave = async (id: number) => {
  const auto = await Autosave.find(id)
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
        logger.info('Auto Save Interest Paid Successfully')
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
        await sendFailedDebitEmail(user.email, auto.title, auto.per)
      }
      await wallet.save()
      await user.save()
    }
    await auto.save()
  }
}

export const monthlyBenefits = async (id: number) => {
  const benefit = await Benefit.find(id)
  if (benefit) {
    const user = await User.find(benefit.userId)
    // const { benefitId, userId, email, name } = job.attrs.data
    // const benefit = await Benefit.findOne({ _id: benefitId })
    const wallet = await Wallet.findBy({ userId: benefit.userId })

    if (!wallet) {
      logger.error('No Wallet found')
      return
    }

    if (!user) {
      logger.error('No User found')
      return
    }

    if (benefit.status === 'completed' || benefit?.debitAttemptCount >= 12) {
      // if (currentDate.isSame(end)) {
      wallet.walletBalance += benefit.current

      await Transaction.create({
        userId: benefit.userId,
        amount: benefit.current,
        title: `Kiddies - ${benefit?.plan}`,
        type: 'credit',
        status: 'success',
      })
      benefit.status = 'completed'
      sendMail(
        {
          subject: 'Zippa Benefit Completed',
          message: `
          <p>You have successfully completed your  ${benefit.plan} Benefit plan</p>
          <p>A Zippa wallet representative will be in touch soonest to complete settlement  </p>
          <br />
          <br />
          <h3>Thank you for choosing Zippa</h3>
          `,
        },
        user
      )

      logger.info(`Job removed for completed benefit payout: ${id}`)
      // }
    }

    if (wallet.walletBalance < benefit.amount) {
      await sendFailedDebitEmail(user.email, `Benefit - ${benefit?.plan}`, benefit?.amount)
      await Transaction.create({
        userId: benefit.userId,
        // username: name,
        amount: benefit?.amount,
        title: `Benefit - ${benefit?.plan} `,
        type: 'debit',
        status: 'failed',
      })
    } else {
      wallet.walletBalance -= benefit.amount
      benefit.debitAttemptCount += 1

      await Transaction.create({
        userId: benefit.userId,
        amount: benefit?.amount,
        title: `Benefit - ${benefit?.plan}`,
        type: 'debit',
        status: 'success',
      })
    }
    await wallet.save()
    await benefit.save()
  }
}

export const monthlyKiddies = async (id: number) => {
  const kiddy = await Kiddy.find(id)
  if (kiddy) {
    const user = await User.find(kiddy.userId)
    const wallet = await Wallet.findBy({ userId: kiddy.userId })

    if (!wallet) {
      logger.error('No Wallet found')
      return
    }

    if (!user) {
      logger.error('No User found')
      return
    }

    if (kiddy?.debitAttemptCount >= 12) {
      // if (currentDate.isSame(end)) {
      wallet.walletBalance += kiddy.current

      await Transaction.create({
        userId: kiddy.userId,
        amount: kiddy.current,
        title: `Kiddies - ${kiddy?.plan}`,
        type: 'credit',
        status: 'success',
      })
      kiddy.status = 'completed'
      sendMail(
        {
          subject: 'Zippa Benefit Completed',
          message: `
            <p>You have successfully completed your  ${kiddy.plan} Kiddies plan</p>
            <p>A Zippa wallet representative will be in touch soonest to complete settlement  </p>
            <br />
            <br />
            <h3>Thank you for choosing Zippa</h3>
            `,
        },
        user
      )

      logger.info(`Job removed for completed benefit payout: ${id}`)
      // }
    }

    if (wallet.walletBalance < kiddy.amount) {
      await sendFailedDebitEmail(user.email, `Kiddy - ${kiddy?.plan}`, kiddy?.amount)
      await Transaction.create({
        userId: kiddy.userId,
        // username: name,
        amount: kiddy?.amount,
        title: `Kiddy - ${kiddy?.plan} `,
        type: 'debit',
        status: 'failed',
      })
    } else {
      wallet.walletBalance -= kiddy.amount
      kiddy.debitAttemptCount += 1

      await Transaction.create({
        userId: kiddy.userId,
        amount: kiddy?.amount,
        title: `Kiddy - ${kiddy?.plan}`,
        type: 'debit',
        status: 'success',
      })
    }
    await wallet.save()
    await kiddy.save()
  }
}
export const scheduledFixedLocked = async (id: number) => {
  const fixed = await FixedLock.find(id)
  if (!fixed) {
    return logger.error(`Fixed locked for id: ${id} not found`)
  }
  // const { fixedId, userId, email, name, endDateObj } = job.attrs.data
  const currentDate = startOfToday()
  const end = startOfDay(new Date(fixed.endDate))
  // const fixed = await FixedLock.findOne({ _id: fixedId })
  const compare = compareAsc(currentDate, end)
  if (compare === 1) {
    const wallet = await Wallet.findBy({ userId: fixed.userId })

    if (!wallet) {
      return logger.error(`No Wallet found for id: ${fixed.userId}`)
    }
    const user = await User.find(fixed.userId)

    if (!user) {
      return logger.error(`No User found for id: ${fixed.userId}`)
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
    await wallet.save()
    await fixed.save()
    logger.info(`Job removed for completed fixedLock: ${id}`)
  }
}
export const scheduleFlex = async (userId: number) => {
  // const userId = Number.parseInt(this.userId)
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
}
