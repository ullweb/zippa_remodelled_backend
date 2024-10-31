import Benefit from '#models/benefit'
import FixedLock from '#models/fixed_lock'
import Kiddy from '#models/kiddy'
import ThriftSave from '#models/thrift_save'
import Transaction from '#models/transaction'
import Wallet from '#models/wallet'
import { getCronExpression } from '#services/saving_service'
import { sendMail } from '#services/sendmail_service'
import { benefitValidator, fixedLockValidator, thriftSaveValidator } from '#validators/flex_save'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { add, differenceInMonths, format } from 'date-fns'

export default class LocksController {
  private benefits = {
    Diamond: {
      benefits: 'Rice, milk, tea, sugar , pasta/macaroni, onions, tomatoes, Beans, semovita',
      amount: 100000,
    },
    Gold: {
      benefits: 'Rice, oil, milk, tea, sugar, pasta/macaroni, onions, tomatoes',
      amount: 50000,
    },
    Silver: {
      benefits: 'Rice, oil, milk, tea, sugar, pasta/macaroni',
      amount: 30000,
    },
    Bronze: {
      benefits: 'Rice, oil, milk, Tea, sugar',
      amount: 20000,
    },
  }

  private kiddies = {
    'Smart 100': {
      benefits:
        'Birthday cake, quarterly snack packs, customized back pack (school bag), customized food flask, customized water flask, coloring set, digital tablet.',
      amount: 100000,
    },
    'Smart 50': {
      benefits:
        'Birthday cake, quarterly snack packs, customized back pack (school bag), customized food flask, customized water flask',
      amount: 50000,
    },
    'Smart 30': {
      benefits:
        'Birthday cake, quarterly snack packs, customized back pack (school bag),coloring set',
      amount: 30000,
    },
    'Smart 20': {
      benefits: 'Birthday cake, quarterly snack packs.',
      amount: 20000,
    },
  }
  // constructor() {
  //   this.benefits =
  // }
  async createFixedLock({ auth, request, response }: HttpContext) {
    logger.info('fixed locked route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const { amount, title } = await request.validateUsing(fixedLockValidator)

    const interest = (22 / 100) * amount

    const endDateObj = this.calculateEndDate(new Date())

    const wallet = await Wallet.findBy({ userId: id })

    if (!wallet) {
      response.safeStatus(400)
      return {
        success: false,
        message: 'No wallet found for user',
      }
    }
    if (+wallet.walletBalance < amount) {
      response.safeStatus(400)
      return {
        success: false,
        message: 'Insufficient funds',
      }
    }
    wallet.walletBalance -= amount
    await wallet.save()
    await Transaction.create({
      userId: id,
      amount: amount,
      title: `Fixed Lock - ${title}`,
      type: 'debit',
      status: 'success',
    })
    const fixed = await FixedLock.create({
      title,
      amount,
      endDate: endDateObj,
      interest,
      userId: id,
      paidBack: 0,
      status: 'ongoing',
    })

    // const scheduleDate = endDateObj.toISOString()

    // const job = agenda.create('fixedLock job', {
    //   fixedId: fixed._id,
    //   userId: id,
    //   email,
    //   name,
    //   endDateObj,
    // })
    // await agenda.start()
    // job.schedule(scheduleDate)
    // await job.save()

    sendMail(
      {
        subject: 'Zippa Fixed Lock Successful',
        message: `
        <h2>${title} - Fixed Lock</h2>
        <p>You have successfully locked ₦${amount} until ${endDateObj} </p>
        <p>You will earn ₦${interest} interest on your savings credited to your account on ${endDateObj} </p>
        <br />
        <br />
        <h3>Thank you for choosing Zippa</h3>
        `,
      },
      checkUser
    )
    // await sendFixedLockEmail({
    //   email,
    //   title,
    //   amount,
    //   endDateObj,
    //   interest,
    // })
    return {
      success: true,
      fixed,
    }
  }

  async lockHome({ auth, response }: HttpContext) {
    logger.info('get fixed locks home route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const ongoing = await FixedLock.query()
      .where({ userId: id, status: 'ongoing' })
      .orderBy('created_at', 'desc')
    const completed = await FixedLock.query()
      .where({ userId: id, status: 'completed' })
      .orderBy('created_at', 'desc')
    const fixedLocks = await FixedLock.findManyBy({ userId: id, status: 'ongoing' })
    let total = 0
    fixedLocks.forEach((fixedLock) => {
      total += fixedLock.amount
    })
    return { success: true, ongoing, completed, total }
  }

  async getFixedLocks({ auth, response }: HttpContext) {
    logger.info('get fixed locks route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const fixedLocks = await FixedLock.query().where({ userId: id }).orderBy('created_at', 'desc')
    return { success: true, fixedLocks }
  }

  async getFixedLock({ auth, params, response }: HttpContext) {
    logger.info('get fixed lock route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = params
    const fixedLock = await FixedLock.find(id)
    return { success: true, fixedLock }
  }

  async getFixedLockTotal({ auth, response }: HttpContext) {
    logger.info('get fixed lock total route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const fixedLocks = await FixedLock.findManyBy({ userId: id })
    let total = 0
    fixedLocks.forEach((fixedLock) => {
      total += fixedLock.amount
    })
    return { success: true, total }
  }

  async createBenefit({ auth, request, response }: HttpContext) {
    logger.info('create benefit route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const { plan, startDate, dayOfMonth } = await request.validateUsing(benefitValidator)

    const startDateObj = new Date(startDate)
    console.log(startDateObj)
    const endDateObj = this.calculateEndDate(startDateObj)

    const { benefits, amount } = this.benefits[plan as 'Diamond' | 'Gold' | 'Silver' | 'Bronze']

    const wallet = await Wallet.findBy({ userId: id })

    if (!wallet) {
      response.safeStatus(400)
      return {
        success: false,
        message: 'No Wallet found',
      }
    }
    let reg = plan === 'Bronze' ? 5000 : 10000

    if (wallet.walletBalance < reg) {
      response.safeStatus(400)
      return {
        success: false,
        message: 'Insufficient funds for registration',
      }
    } else {
      await Wallet.query().where({ userId: id }).decrement('wallet_balance', reg)
      await Transaction.create({
        userId: id,
        amount: reg,
        title: `Benefit - ${plan} registration fee`,
        type: 'debit',
        status: 'success',
      })
    }
    const cron = getCronExpression('monthly', '7:00', 0, dayOfMonth)

    const benefit = await Benefit.create({
      plan: plan as 'Diamond' | 'Gold' | 'Silver' | 'Bronze',
      amount,
      current: 0,
      startDate: format(startDateObj, 'dd/MM/yyyy'),
      endDate: endDateObj,
      registered: true,
      benefits,
      userId: id,
      cron,
    })

    // const initialStartTime = calculateInitialStartTime(startDate, 'monthly', '7:00', 1, dayOfMonth)

    // const job = agenda.create('recurringBenefit job wallet', {
    //   benefitId: benefit._id,
    //   userId: id,
    //   email,
    //   name,
    //   dayOfMonth,
    // })
    // await agenda.start()
    // job.schedule(initialStartTime)
    // await job.save()

    // const payJob = agenda.create('benefit payout job', {
    //   benefitId: benefit._id,
    //   userId: id,
    //   email,
    //   endDateObj,
    //   name,
    // })
    // await agenda.start()
    // payJob.schedule(endDateObj)
    // await payJob.save()

    sendMail(
      {
        subject: 'Zippa Kiddies Successful',
        message: `
        <h2>${plan} - Benefit Plan</h2>
        <p>You have successfully subscribed to the Zippa wallet ${plan} Benefit plan ending 1 year from now(${endDateObj}) </p>
        <p>Ensure not to default on your monthly contributions to enjoy the benefits of this plan</p>
        <p>Benefits include: ${benefits}</p>
        <br />
        <br />
        <h3>Thank you for choosing Zippa</h3>
        `,
      },
      checkUser
    )
    // await sendBenefitEmail({ email, title: plan, endDate: endDateObj, benefits })

    return {
      success: true,
      benefit,
      message: 'Benefit created successfully',
    }
  }

  async benefitsHome({ auth, response }: HttpContext) {
    logger.info('get benefits home route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const ongoing = await Benefit.query()
      .where({ userId: id, status: 'ongoing' })
      .orderBy('created_at', 'desc')
    const completed = await Benefit.query()
      .where({ userId: id, status: 'completed' })
      .orderBy('created_at', 'desc')
    const benefits = await Benefit.findManyBy({ userId: id, status: 'ongoing' })
    let total = 0
    benefits.forEach((benefit) => {
      total += benefit.current
    })
    return { success: true, ongoing, completed, total }
  }

  async getBenefits({ auth, response }: HttpContext) {
    logger.info('get benefits route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const benefits = await Benefit.query().where({ userId: id }).orderBy('created_at', 'desc')
    return { success: true, benefits }
  }

  async getBenefit({ auth, response, params }: HttpContext) {
    logger.info('get single benefit route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = params
    const benefit = await Benefit.find(id)
    return { success: true, benefit }
  }

  async getBenefitTotal({ auth, response }: HttpContext) {
    logger.info('get benefit total route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const benefits = await Benefit.findManyBy({ userId: id })
    let total = 0
    benefits.forEach((benefit) => {
      total += benefit.current
    })
    return { success: true, total }
  }
  async createThriftSave({ auth, request, response }: HttpContext) {
    logger.info('create thrift save route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const { title, frequency, per, startDate, timeOfDay, dayOfWeek, dayOfMonth } =
      await request.validateUsing(thriftSaveValidator)

    // const startDateObj = new Date(startDate)

    // const initialStartTime = calculateInitialStartTime(
    //   startDate,
    //   frequency,
    //   timeOfDay,
    //   dayOfWeek,
    //   dayOfMonth
    // )
    const cron = getCronExpression(frequency, timeOfDay, dayOfWeek, dayOfMonth)

    const interest = 0

    const thrift = await ThriftSave.create({
      title,
      amount: 0,
      frequency,
      startDate: startDate,
      per,
      interest,
      userId: id,
      cron,
    })

    // const job = agenda.create('recurringThrift job wallet', {
    //   thriftId: thrift._id,
    //   userId: id,
    //   email,
    //   name,
    //   cronExpression,
    // })
    // await agenda.start()
    // job.schedule(initialStartTime)
    // await job.save()

    // await sendThriftEmail({ email, title, per, frequency })
    return {
      success: true,
      thrift,
    }
  }

  async thriftsHome({ auth, response }: HttpContext) {
    logger.info('get thrifts home route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const ongoing = await ThriftSave.query()
      .where({ userId: id, status: 'ongoing' })
      .orderBy('created_at', 'desc')
    const completed = await ThriftSave.query()
      .where({ userId: id, status: 'completed' })
      .orderBy('created_at', 'desc')
    const thrifts = await ThriftSave.findManyBy({ userId: id, status: 'ongoing' })
    let total = 0
    thrifts.forEach((thrift) => {
      total += thrift.amount
    })
    return { success: true, ongoing, completed, total }
  }

  async getThriftSaves({ auth, response }: HttpContext) {
    logger.info('get thrift saves route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const thrifts = await ThriftSave.query().where({ userId: id }).orderBy('created_at', 'desc')
    return {
      success: true,
      thrifts,
    }
  }

  async getThriftSave({ auth, response }: HttpContext) {
    logger.info('create benefit route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const thrift = await ThriftSave.find(id)
    return {
      success: true,
      thrift,
    }
  }

  async getThriftTotal({ auth, response }: HttpContext) {
    logger.info('create benefit route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const thriftSaves = await ThriftSave.findManyBy({ userId: id })
    let total = 0
    thriftSaves.forEach((thriftSave) => {
      total += thriftSave.amount
    })
    return {
      success: true,
      total,
    }
  }

  async withdrawThrift({ auth, params, response }: HttpContext) {
    logger.info('create benefit route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const { id: thriftId } = params

    const balance = await ThriftSave.find(thriftId)
    if (!balance) {
      response.safeStatus(400)
      return {
        success: false,
        message: 'Thrift does not exist',
      }
    }
    const durationInMonths = differenceInMonths(new Date(balance.startDate), new Date())

    const interestRate = durationInMonths * 1.25
    const interest = (interestRate / 100) * balance.amount
    ;(balance.amount -= 0), (balance.status = 'completed')
    await balance.save()

    // const endDateObj = new Date()

    await Wallet.query()
      .where({ userId: id })
      .increment('wallet_balance', balance.amount + interest)
    await Transaction.create({
      userId: id,
      amount: balance.amount,
      title: `Thrift - ${balance.title}`,
      type: 'credit',
      status: 'success',
    })
    await Transaction.create({
      userId: id,
      amount: interest,
      title: `Thrift Interest - ${balance.title}`,
      type: 'credit',
      status: 'success',
    })
    // await sendThriftWithdrawEmail({
    //   email,
    //   title: balance.title,
    //   amount: balance.amount + interest,
    // });

    return { success: true, message: 'Withdrawal Successful, Wallet Credited' }
  }

  async createKiddies({ auth, request, response }: HttpContext) {
    logger.info('create kiddies route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const { plan, startDate, dayOfMonth } = await request.validateUsing(benefitValidator)

    // Calculate the end date exactly one year from the start date
    const startDateObj = new Date(startDate)
    const endDateObj = this.calculateEndDate(startDateObj, 2)

    // Get plan details
    const { benefits, amount } =
      this.kiddies[plan as 'Smart 100' | 'Smart 50' | 'Smart 30' | 'Smart 20']

    const wallet = await Wallet.findBy({ userId: id })

    if (!wallet) {
      response.safeStatus(400)
      return {
        success: false,
        message: 'No Wallet found',
      }
    }
    let reg = plan === 'Smart 20' ? 5000 : 10000

    if (wallet.walletBalance < reg) {
      response.safeStatus(400)
      return {
        success: false,
        message: 'Insufficient funds for registration',
      }
    } else {
      await Wallet.query().where({ userId: id }).decrement('wallet_balance', reg)
      await Transaction.create({
        userId: id,
        amount: reg,
        title: `Kiddies - ${plan} registration fee`,
        type: 'debit',
        status: 'success',
      })
    }
    const cron = getCronExpression('monthly', '7:00', 0, dayOfMonth)
    const benefit = await Kiddy.create({
      plan: plan as 'Smart 100' | 'Smart 50' | 'Smart 30' | 'Smart 20',
      amount,
      current: 0,
      startDate: startDate,
      endDate: endDateObj,
      registered: true,
      benefits,
      userId: id,
      cron,
    })

    // const initialStartTime = calculateInitialStartTime(startDate, dayOfMonth)

    // const job = agenda.create('recurrinKid job wallet', {
    //   benefitId: benefit._id,
    //   userId: id,
    //   email,
    //   name,
    //   dayOfMonth,
    // })
    // await agenda.start()
    // job.schedule(initialStartTime)
    // await job.save()

    // const payJob = agenda.create('kid payout job', {
    //   benefitId: benefit._id,
    //   userId: id,
    //   email,
    //   endDateObj,
    //   name,
    // })
    // await agenda.start()
    // payJob.schedule(endDateObj)
    // await payJob.save()

    sendMail(
      {
        subject: 'Zippa Kiddies Successful',
        message: `
          <h2>${plan} - Kiddies Plan</h2>
          <p>You have successfully subscribed to the Zippa wallet ${plan} Kiddies plan ending 1 year from now(${endDateObj}) </p>
          <p>Ensure not to default on your monthly contributions to enjoy the benefits of this plan</p>
          <p>Benefits include: ${benefits}</p>
          <br />
          <br />
          <h3>Thank you for choosing Zippa</h3>
          `,
      },
      checkUser
    )
    // await sendKiddiesEmail({ email, title: plan, endDate: endDateObj, benefits })

    return {
      success: true,
      kid: benefit,
      message: 'Kiddies created successfully',
    }
  }

  async kiddiesHome({ auth, response }: HttpContext) {
    logger.info('get kiddies home route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const ongoing = await Kiddy.query()
      .where({ userId: id, status: 'ongoing' })
      .orderBy('created_at', 'desc')
    const completed = await Kiddy.query()
      .where({ userId: id, status: 'completed' })
      .orderBy('created_at', 'desc')
    const kiddies = await Kiddy.findManyBy({ userId: id, status: 'ongoing' })
    let total = 0
    kiddies.forEach((kiddy) => {
      total += kiddy.current
    })
    return { success: true, ongoing, completed, total }
  }
  async getKiddiesAll({ auth, response }: HttpContext) {
    logger.info('get all kiddies route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const kids = await Kiddy.findManyBy({ userId: id })
    return {
      success: true,
      kids,
    }
  }

  async getKiddies({ auth, response }: HttpContext) {
    logger.info('get single kiddies route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const kid = await Kiddy.find(id)
    return {
      success: true,
      kid,
    }
  }

  async getKiddiesTotal({ auth, response }: HttpContext) {
    logger.info('get kiddies total route')
    await auth.check()
    const checkUser = auth.user
    if (!checkUser) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = checkUser
    const kids = await Kiddy.findManyBy({ userId: id })
    let total = 0
    kids.forEach((kid) => {
      total += kid.current
    })
    return {
      success: true,
      total,
    }
  }
  private calculateEndDate(date: any, year: number = 1): string {
    console.log(date)
    const added = add(date, { years: year })
    return format(added, 'dd/MM/yyyy')
  }
}
