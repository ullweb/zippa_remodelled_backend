import Transaction from '#models/transaction'
import User from '#models/user'
import { getSavingsTotal } from '#services/saving_service'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

export default class HomeController {
  async index({ auth, response }: HttpContext) {
    logger.info('home route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    // transactions
    const user = await User.query().preload('wallet').where('id', id).first()

    const savings = await getSavingsTotal(id)
    const transactions = await Transaction.query()
      .where({ userId: id })
      .limit(10)
      .orderBy('created_at', 'desc')
    return {
      success: true,
      id,
      transactions,
      wallet: user?.wallet,
      savings,
    }
  }
}
