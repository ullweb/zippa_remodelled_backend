import Autosave from '#models/autosave'
import { getCronExpression } from '#services/saving_service'
import { autosaveValidator } from '#validators/saving'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'

export default class AutosavesController {
  async index({ auth, response }: HttpContext) {
    logger.info('target route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser

    const autoSaves = await Autosave.findManyBy({ userId: id, status: 'ongoing' })

    const completed = await Autosave.findManyBy({ userId: id, status: 'completed' })
    let total = 0
    autoSaves.forEach((autoSave) => {
      total += autoSave.current
    })

    return {
      success: true,
      total,
      ongoing: autoSaves,
      completed,
    }
  }
  async getAutosaves({ auth, params, response }: HttpContext) {
    logger.info('get auto save route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = params

    const autoSave = await Autosave.find(id)
    return {
      success: true,
      autoSave,
    }
  }

  async getAutoSaveTotal({ auth, response }: HttpContext) {
    logger.info('get auto save total route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const autoSaves = await Autosave.findManyBy({ userId: id })
    let total = 0
    if (autoSaves) {
      autoSaves.forEach((autoSave) => {
        total += autoSave.current
      })
      return {
        status: true,
        total,
      }
    } else {
      response.safeStatus(500)
      return { success: false, total, message: 'No auto save found' }
    }
  }
  async createAutoSave({ auth, request, response }: HttpContext) {
    logger.info('get create auto save route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id, email } = checkUser
    const { title, amount, endDate, frequency, per, timeOfDay, dayOfWeek, dayOfMonth, startDate } =
      await request.validateUsing(autosaveValidator)

    const interest = (18 / 100) * amount
    const endDateObj = new Date(endDate)
    const startDateObj = new Date(startDate)

    // const initialStartTime = calculateInitialStartTime(
    //   startDateObj,
    //   frequency,
    //   timeOfDay,
    //   dayOfWeek,
    //   dayOfMonth
    // )
    const cronExpression = getCronExpression(frequency, timeOfDay, dayOfWeek, dayOfMonth)

    const autoSave = await Autosave.create({
      title,
      amount,
      current: 0,
      startDate: startDateObj,
      endDate: endDateObj,
      frequency,
      per,
      interest,
      userId: id,
      cron: cronExpression,
    })
    await mail.send((message) => {
      message.to(email).subject('Zippa AutoSave Successful').html(`
          <h1>Your ${title} AutoSave has been successfully subscribed</h1>
          ${per} will be deducted from your account ${frequency} starting from ${startDate} to ${endDate}
          <br/>
          <h2>Amount: ₦${amount}</h2>
          <h2>Interest: 18%</h2>
          <br/>
          ₦${+amount + (18 / 100) * amount} will be credited to your wallet at the end of the AutoSave period if you do not default on any payment.
          <br/>
          <br/>
          <h3>Thank you for choosing Zippa</h3>
    `)
    })

    // const job = agenda.create('recurringAutoSave job wallet', {
    //   autoSaveId: autoSave._id,
    //   userId: id,
    //   email,
    //   name,
    //   endDateObj,
    //   cronExpression,
    // })
    // await agenda.start()
    // job.schedule(initialStartTime)
    // await job.save()

    // await sendAutoSaveEmail({
    //   email,
    //   title,
    //   amount,
    //   startDate: startDateObj,
    //   endDate,
    //   frequency,
    //   per,
    // })
    return {
      success: true,
      autoSave,
    }
  }
}
