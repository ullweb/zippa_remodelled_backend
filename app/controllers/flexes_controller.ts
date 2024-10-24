import FlexSave from '#models/flex_save'
import FlexTransaction from '#models/flex_transaction'
import Transaction from '#models/transaction'
import Wallet from '#models/wallet'
import { topupFlexValidator } from '#validators/flex_save'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { add, compareAsc, format } from 'date-fns'

export default class FlexesController {
  async topupFlex({ request, auth, response }: HttpContext) {
    logger.info('flex topup route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser

    const { amount } = await request.validateUsing(topupFlexValidator)
    const wallet = await Wallet.findBy({ userId: id })

    if (!wallet) {
      response.safeStatus(400)
      return {
        success: false,
        message: 'No Wallet found',
      }
    }

    if (wallet.walletBalance < amount) {
      response.safeStatus(400)
      return {
        success: false,
        message: 'Insufficient funds',
      }
    }
    let balance = await FlexSave.findBy({ userId: id })

    if (!balance) {
      await Wallet.query().where({ userId: id }).decrement('wallet_balance', amount)
      balance = await FlexSave.create({
        userId: id,
        amount,
        status: 'ongoing',
        withdrawAt: format(add(new Date(), { months: 6 }), 'dd/MM/yyyy'),
        // userName: name,
      })

      // const newJob = agenda.create('flex job', {
      //   userId: id,
      //   name,
      // })
      // await agenda.start()
      // newJob.repeatEvery('0 7 1 * *')
      // await newJob.save()
    } else {
      const newAmount = balance.amount + amount
      await Wallet.query().where({ userId: id }).decrement('wallet_balance', amount)
      balance.amount = newAmount
      await balance.save()
    }

    // let flex = await FlexSave.findBy({ userId: id })

    const transactions = await FlexTransaction.create({
      userId: id,
      amount,
      newBalance: balance?.amount,
      previousBalance: balance?.amount - amount,
      type: 'deposit',
    })
    await Transaction.create({
      userId: id,
      amount: amount,
      title: 'Flex Wallet Topup',
      type: 'debit',
      status: 'success',
    })

    // await sendFlexTopupEmail({ email, amount })

    return {
      success: true,
      transactions,
      total: balance.amount,
      message: 'Flex Wallet Topup Successful',
    }
  }

  async withdrawFlex({ auth, request, response }: HttpContext) {
    logger.info('flex withdrawal route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const { amount } = await request.validateUsing(topupFlexValidator)

    const flexSave = await FlexSave.findBy({ userId: id })
    if (!flexSave) {
      response.safeStatus(400)
      return {
        success: false,
        message: 'Flex account not found',
      }
    }

    if (flexSave.amount < amount) {
      logger.info('Insufficient funds')
      response.safeStatus(400)
      return {
        success: false,
        message: 'Insufficient funds',
      }
    }
    const compare = compareAsc(new Date(flexSave.withdrawAt), new Date())
    if (compare === -1) {
      const earlyWithdrawalFee = (1 / 100) * amount
      const wallet = await Wallet.findBy({ userId: id })

      if (!wallet) {
        response.safeStatus(400)
        return {
          success: false,
          message: 'No Wallet found',
        }
      }
      if (wallet.walletBalance < earlyWithdrawalFee) {
        response.safeStatus(400)
        return {
          success: false,
          message: 'Insufficient funds for early withdrawal fee',
        }
      }
      await Wallet.query().where({ userId: id }).decrement('wallet_balance', earlyWithdrawalFee)
      await Transaction.create({
        userId: id,
        amount: earlyWithdrawalFee,
        title: 'Flex Wallet Early Withdrawal Fee',
        type: 'debit',
        status: 'success',
      })
    }
    flexSave.amount -= amount
    await flexSave.save()

    await Wallet.query().where({ userId: id }).increment('wallet_balance', amount)
    await FlexTransaction.create({
      userId: id,
      amount,
      newBalance: flexSave?.amount,
      previousBalance: flexSave?.amount + amount,
      type: 'withdrawal',
    })

    await Transaction.create({
      userId: id,
      amount,
      title: 'Flex Wallet Withdrawal',
      type: 'credit',
      status: 'success',
    })

    const balance = await FlexSave.findBy({ userId: id })
    const transactions = await FlexTransaction.query()
      .where({ userId: id })
      .orderBy('created_at', 'desc')

    // await sendWithdrawFlexEmail({ email, amount });
    return {
      success: true,
      transactions,
      total: balance?.amount ?? 0,
      message: 'Withdrawal Successful',
    }
  }

  async flexTotal({ auth, response }: HttpContext) {
    logger.info('flex total route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const balance = await FlexSave.findBy({ userId: id })

    return { success: true, total: balance?.amount ?? 0 }
  }

  async getFlexTransactions({ auth, response }: HttpContext) {
    logger.info('flex transaction route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const balance = await FlexSave.findBy({ userId: id })
    const transactions = await FlexTransaction.query()
      .where({ userId: id })
      .orderBy('created_at', 'desc')
    return { success: true, transactions, total: balance?.amount ?? 0 }
  }
}
