import User from '#models/user'
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
    const user = await User.query()
      .preload('wallet')
      .preload('transactions')
      .where('id', id)
      .first()
    return {
      success: true,
      id,
      transactions: user?.transactions,
      wallet: user?.wallet,
    }
  }
}
