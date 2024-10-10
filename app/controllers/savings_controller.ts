import User from '#models/user'
import { getSavingsTotal } from '#services/saving_service'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

export default class SavingsController {
  async index({ auth, response }: HttpContext) {
    logger.info('savings route')
    await auth.check()
    const checkUser: User | undefined = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const { total, target } = await getSavingsTotal(id)

    return { success: true, total, target }
  }
}
