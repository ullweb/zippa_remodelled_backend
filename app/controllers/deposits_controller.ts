import Card from '#models/card'
import Deposit from '#models/deposit'
import Transaction from '#models/transaction'
import Wallet from '#models/wallet'
import env from '#start/env'
import { initiateValidator } from '#validators/deposit'
import type { HttpContext } from '@adonisjs/core/http'
import { StatusCodes } from 'http-status-codes'
import { Paystack } from 'paystack-sdk'

export default class DepositsController {
  async getWallet({ auth, response }: HttpContext) {
    await auth.check()
    const user = auth.user
    if (!user) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = user
    const balance = await Wallet.find(id)
    return { success: true, wallet: balance }
  }

  async getAllWalletsTotal({ auth, response }: HttpContext) {
    await auth.check()
    const user = auth.user
    if (!user) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const wallets = await Wallet.all()
    let total = 0
    wallets.forEach((wallet) => {
      total += wallet.walletBalance
    })
    return { success: true, total }
  }

  async initiateTopup({ auth, request, response }: HttpContext) {
    await auth.check()
    const user = auth.user
    if (!user) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = user
    const { amount, ref } = await request.validateUsing(initiateValidator)

    await Deposit.create({ amount, referenceId: ref, userId: id, status: 'pending' })
    // await Transaction.create({ amount, referenceId: ref, userId: id, status: 'pending' })
    // const job = agenda.create('verify topup', {
    //   reference: ref,
    // // })
    // await agenda.start()
    // job.schedule('in 15 minutes')
    // await job.save()
    return { success: true, message: 'Wallet Topup Initiated' }
  }

  async verifyTopup({ auth, params, request, response }: HttpContext) {
    await auth.check()
    const user = auth.user
    if (!user) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id: userId } = user
    // const { id, name } = req.user;
    let reference = params.id
    // const { id: reference } = await request.validateUsing(verifyValidator)
    const saveCard = request.input('saveCard')
    try {
      const trans = await Deposit.findBy({ referenceId: reference })

      const paystack = new Paystack(env.get('PAYSTACK_SECRET_KEY')!)
      const paystackResponse = await paystack.transaction.verify(`${reference}`)
      const { data, message, status } = paystackResponse
      console.log('data =>', data, 'message =>', message, 'status =>', status)
      if (data && data.amount === trans?.amount && status) {
        await Deposit.query().where({ referenceId: reference }).update({ status: data.status })
        await Wallet.query().where({ userId: userId }).increment({ walletBalance: data.amount })
        await Transaction.create({
          userId,
          amount: data.amount,
          title: 'Wallet Topup',
          type: 'credit',
          status: 'success',
        })
        if (saveCard) {
          const cards = await Card.findManyBy({ user: userId })
          if (cards.length > 0) {
            for (let card of cards) {
              if (card?.authorization?.signature === data?.authorization?.signature) {
                return { success: true, message: 'Wallet Topup Successful' }
              }
            }
          }
          await Card.create({
            userId: userId,
            email: data?.customer?.email,
            authorization: data?.authorization,
          })
          return { success: true, message: 'Wallet Topup Successful' }
        }
      } else {
        await Deposit.query().where({ referenceId: reference }).delete()
        response.safeStatus(StatusCodes.BAD_REQUEST).json({ success: false, message })
      }
    } catch (error) {
      console.error(error)
      response
        .safeStatus(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: 'An error occurred while verifying the transaction' })
    }
  }
  async getTransactions({ auth, response }: HttpContext) {
    await auth.check()
    const user = auth.user
    if (!user) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const transactions = await Transaction.query().orderBy('created_at', 'desc')

    return {
      success: true,
      transactions,
    }
  }
}
