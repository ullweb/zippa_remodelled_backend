import env from '#start/env'
import {
  airtimeValidator,
  cableValidator,
  customerValidator,
  dataValidator,
  meterValidator,
} from '#validators/bill'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import moment from 'moment'
import { generate } from 'randomstring'
import Wallet from '#models/wallet'
import Transaction from '#models/transaction'
import got from 'got'
import Bill from '#models/bill'
import mail from '@adonisjs/mail/services/main'

export default class BillsController {
  private readonly baseUrl = 'https://api-service.vtpass.com/api'
  // private baseUrl = 'https://vtpass.com/api'
  // private baseUrl = 'https://sandbox.vtpass.com/api'

  private readonly getHeader = {
    'api-key': env.get('VTP_API_KEY'),
    'public-key': env.get('VTP_PUBLIC_KEY'),
  }
  private readonly postHeader = {
    'api-key': env.get('VTP_API_KEY'),
    'secret-key': env.get('VTP_SECRET_KEY'),
  }
  private readonly generateRequestId = (): string => {
    const datePart = moment().format('YYYYMMDDHHmm')
    const randomPart = generate(6)
    return datePart + randomPart
  }
  async getTransactions({ auth, response }: HttpContext) {
    logger.info('buy airtime route')
    await auth.check()
    const user = auth.user
    if (!user) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const transactions = await Transaction.query()
      .where({
        userId: user.id,
        type: 'debit',
        status: 'success',
      })
      .orderBy('created_at', 'desc')
      .limit(5)

    return {
      success: true,
      transactions,
    }
  }
  async buyAirtime({ auth, request, response }: HttpContext) {
    logger.info('buy airtime route')
    await auth.check()
    const user = auth.user
    if (!user) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = user
    const { amount, phone, network } = await request.validateUsing(airtimeValidator)

    const request_id = this.generateRequestId()

    // if (network === '9mobile') {
    //   network = 'etisalat'
    // }

    const balance = await Wallet.query().where({ user_id: id }).first()
    if (balance) {
      if (balance.walletBalance < amount) {
        await Transaction.create({
          userId: id,
          // username: name,
          amount: amount,
          title: 'Airtime Purchase',
          type: 'debit',
          status: 'failed',
        })
        response.safeStatus(400)
        return {
          success: false,
          message: 'Insufficient funds',
        }
      }
      const newAmount = balance.walletBalance - amount
      await Wallet.query().where({ user_id: id }).update({ wallet_balance: newAmount })
      await Transaction.create({
        userId: id,
        // username: name,
        amount: amount,
        title: 'Airtime Purchase',
        type: 'debit',
        status: 'success',
      })
    }

    try {
      const buy: any = await got
        .post(`${this.baseUrl}/pay`, {
          // .post('https://sandbox.vtpass.com/api/pay', {
          headers: this.postHeader,
          json: {
            amount,
            phone,
            request_id,
            serviceID: network === '9mobile' ? 'etisalat' : network,
          },
        })
        .json()

      if (buy.code === '000') {
        await Bill.create({
          userId: id,
          reference: request_id,
          type: 'Airtime',
          amount: amount,
          provider: network,
          recipient: phone,
          status: 'success',
        })
        return {
          success: true,
          message: buy.response_description,
          response: buy,
        }
      } else {
        await Bill.create({
          userId: id,
          reference: request_id,
          type: 'Airtime',
          amount: amount,
          provider: network,
          recipient: phone,
          status: 'failed',
        })
        await Wallet.query().where({ user_id: id }).increment({ wallet_balance: amount })
        await Transaction.create({
          userId: id,
          // username: name,
          amount: amount,
          title: 'Refund: Failed Airtime Purchase',
          type: 'credit',
          status: 'success',
        })
        response.safeStatus(400)
        return {
          success: false,
          message: buy.response_description,
        }
      }
    } catch (error) {
      console.log(error)
      response.safeStatus(500)
      return {
        success: false,
        message: 'An error occurred',
      }
    }
  }

  async buyData({ auth, request, response }: HttpContext) {
    await auth.check()
    const user = auth.user
    if (!user) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = user
    const { phone, amount, billersCode, serviceID, variation_code } =
      await request.validateUsing(dataValidator)

    const request_id = this.generateRequestId()

    const balance = await Wallet.query().where({ user_id: id }).first()
    if (balance) {
      if (balance.walletBalance < amount) {
        await Transaction.create({
          userId: id,
          // username: name,
          amount: amount,
          title: 'Data Purchase',
          type: 'debit',
          status: 'failed',
        })
        response.safeStatus(400)
        return { success: false, message: 'Insufficient funds' }
      }
      const newAmount = balance.walletBalance - amount
      await Wallet.query().where({ user_id: id }).update({ wallet_balance: newAmount })
      await Transaction.create({
        userId: id,
        // username: name,
        amount: amount,
        title: 'Data Purchase',
        type: 'debit',
        status: 'success',
      })
    }

    try {
      const buy: any = await got
        .post(`${this.baseUrl}/pay`, {
          headers: this.postHeader,
          json: {
            billersCode,
            serviceID,
            variation_code,
            request_id,
            amount,
            phone,
          },
        })
        .json()

      if (buy.code === '000') {
        await Bill.create({
          userId: id,
          reference: request_id,
          type: 'Data',
          amount: amount,
          provider: serviceID,
          package: variation_code,
          recipient: phone,
          status: 'success',
        })
        return {
          success: true,
          message: buy.response_description,
          data: buy.content.transactions,
        }
      } else {
        await Bill.create({
          userId: id,
          reference: request_id,
          type: 'Data',
          amount: amount,
          provider: serviceID,
          package: variation_code,
          recipient: phone,
          status: 'failed',
        })
        await Wallet.query().where({ user_id: id }).increment({ wallet_balance: amount })
        await Transaction.create({
          userId: id,
          // username: name,
          amount: amount,
          title: 'Refund: Failed Data Purchase',
          type: 'credit',
          status: 'success',
        })
        response.safeStatus(400)
        return {
          success: false,
          message: buy.response_description,
          response: buy,
        }
      }
    } catch (error) {
      console.log(error, 'catch error')
      response.safeStatus(500)
      return {
        success: false,
        message: 'An error occurred',
      }
    }
  }

  async buyElectricity({ auth, request, response }: HttpContext) {
    await auth.check()
    const user = auth.user
    if (!user) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id, email } = user
    const { serviceID, billersCode, variation_code, amount, phone } =
      await request.validateUsing(dataValidator)
    const request_id = this.generateRequestId()

    const balance = await Wallet.query().where({ user_id: id }).first()
    if (balance) {
      if (balance.walletBalance < amount) {
        await Transaction.create({
          userId: id,
          // username: name,
          amount: amount,
          title: 'Electricity Purchase',
          type: 'debit',
          status: 'failed',
        })
        response.safeStatus(400)
        return { success: false, message: 'Insufficient funds' }
      }
      const newAmount = balance.walletBalance - amount
      await Wallet.query().where({ user_id: id }).update({ wallet_balance: newAmount })
      await Transaction.create({
        userId: id,
        // username: name,
        amount: amount,
        title: 'Electricity Purchase',
        type: 'debit',
        status: 'success',
      })
    }

    try {
      const buy: any = await got
        .post(`${this.baseUrl}/pay`, {
          headers: this.postHeader,
          json: {
            phone,
            serviceID,
            billersCode,
            variation_code,
            request_id,
            amount,
          },
        })
        .json()

      if (buy.code === '000') {
        await Bill.create({
          userId: id,
          reference: request_id,
          type: 'Electricity',
          amount: amount,
          provider: serviceID,
          package: variation_code,
          recipient: billersCode,
          status: 'success',
        })
        if (variation_code === 'prepaid') {
          await mail.send((message) => {
            message.to(email).subject('Zippa Electricity Token').html(`
                <h1>Electricity Token!</h1>
                <p>${buy.token}</p>
                `)
          })
          return {
            success: true,
            message: buy.response_description,
            token: buy.token,
            details: buy.content.transactions,
          }
        } else {
          return {
            success: true,
            message: buy.response_description,
            details: buy.content.transactions,
          }
        }
      } else {
        await Bill.create({
          userId: id,
          reference: request_id,
          type: 'Electricity',
          amount: amount,
          provider: serviceID,
          package: variation_code,
          recipient: billersCode,
          status: 'failed',
        })

        await Wallet.query().where({ user_id: id }).increment({ wallet_balance: amount })
        await Transaction.create({
          userId: id,
          // username: name,
          amount: amount,
          title: 'Refund: Failed Electricity Purchase',
          type: 'credit',
          status: 'success',
        })
        response.safeStatus(400)
        return { success: false, message: buy.response_description }
      }
    } catch (error) {
      return response.safeStatus(500).json({ success: false, message: 'An error occurred' })
    }
  }
  async subscribeCable({ auth, request, response }: HttpContext) {
    await auth.check()
    const user = auth.user
    if (!user) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = user
    const { serviceID, billersCode, variation_code, amount, phone, change } =
      await request.validateUsing(cableValidator)
    const request_id = this.generateRequestId()

    const balance = await Wallet.query().where({ user_id: id }).first()
    if (balance) {
      if (balance.walletBalance < amount) {
        await Transaction.create({
          userId: id,
          // username: name,
          amount: amount,
          title: 'Cable Subscription',
          type: 'debit',
          status: 'failed',
        })
        response.safeStatus(400)
        return { success: false, message: 'Insufficient funds' }
      }
      const newAmount = balance?.walletBalance - amount
      await Wallet.query().where({ user_id: id }).update({ wallet_balance: newAmount })
      await Transaction.create({
        userId: id,
        // username: name,
        amount: amount,
        title: 'Cable Subscription',
        type: 'debit',
        status: 'success',
      })
    }

    try {
      let buy: any
      if (change === 'change') {
        buy = await got
          .post(`${this.baseUrl}/pay`, {
            headers: this.postHeader,
            json: {
              phone,
              serviceID,
              billersCode,
              variation_code,
              request_id,
              amount,
              subscription_type: change,
            },
          })
          .json()
      }
      if (change === 'renew') {
        buy = await got
          .post(`${this.baseUrl}/pay`, {
            headers: this.postHeader,
            json: {
              phone,
              serviceID,
              billersCode,
              request_id,
              amount,
              subscription_type: change,
            },
          })
          .json()
      }

      if (buy.code === '000') {
        await Bill.create({
          userId: id,
          reference: request_id,
          type: 'Cable',
          amount: amount,
          provider: serviceID,
          package: variation_code,
          recipient: billersCode,
          status: 'success',
        })
        return { success: true, message: buy.response_description, data: buy.content }
      } else {
        await Bill.create({
          userId: id,
          reference: request_id,
          type: 'Cable',
          amount: amount,
          provider: serviceID,
          package: variation_code,
          recipient: billersCode,
          status: 'failed',
        })
        await Wallet.query().where({ user_id: id }).increment({ wallet_balance: amount })
        await Transaction.create({
          userId: id,
          // username: name,
          amount: amount,
          title: 'Refund: Failed Cable Subscription',
          type: 'credit',
          status: 'success',
        })
        response.safeStatus(400)
        return { success: false, message: buy.response_description }
      }
    } catch (error) {
      console.log(error)
      response.safeStatus(500)
      return { success: false, message: 'An error occurred', error: error }
    }
  }
  async verifyMeter({ request, response }: HttpContext) {
    const { billersCode, serviceID, type } = await request.validateUsing(meterValidator)

    try {
      const verify: any = await got
        .post(`${this.baseUrl}/merchant-verify`, {
          headers: this.postHeader,
          json: {
            billersCode,
            serviceID,
            type,
          },
        })
        .json()

      if (verify.code === '000') {
        if (Object.keys(verify.content).includes('error')) {
          return { success: false, ...verify.content }
        }
        return { success: true, details: verify.content }
      } else {
        response.safeStatus(400)
        return { success: false, message: verify.response_description }
      }
    } catch (error) {
      console.log(error)
      response.safeStatus(500)
      return { success: false, message: 'An error occurred', error }
    }
  }
  async verifyCustomer({ request, response }: HttpContext) {
    const { billersCode, serviceID } = await request.validateUsing(customerValidator)

    try {
      const verify: any = await got
        .post(`${this.baseUrl}/merchant-verify`, {
          headers: this.postHeader,
          json: {
            billersCode,
            serviceID,
          },
        })
        .json()
      console.log(verify)
      if (verify.code === '000') {
        if (Object.keys(verify.content).includes('error')) {
          return { success: false, ...verify.content }
        }
        return { success: true, details: verify.content }
      } else {
        response.safeStatus(400)
        return { success: false, message: verify.response_description }
      }
    } catch (error) {
      response.safeStatus(500)
      return { success: false, message: 'An error occurred', error: error }
    }
  }

  async requery({ params, response }: HttpContext) {
    const id = params.id
    try {
      const fd = new FormData()
      fd.append('request_id', id)
      const variations: any = await got
        .post(`${this.baseUrl}/requery`, {
          headers: this.getHeader,
          body: fd,
        })
        .json()

      if (variations.response_description === '000') {
        return {
          success: true,
          variations: variations?.content?.transactions,
        }
      } else {
        console.log(variations)
        response.safeStatus(400)
        return {
          success: false,
          message: variations.content.errors,
        }
      }
    } catch (error) {
      response.safeStatus(500)
      return {
        success: false,
        message: 'An error occurred',
      }
    }
  }

  async getVariations({ params, response }: HttpContext) {
    let id = params.id

    if (id === '9mobile-data') {
      id = 'etisalat-data'
    }
    console.log(id)
    try {
      const variations: any = await got
        .get(`${this.baseUrl}/service-variations?serviceID=${id}`, {
          headers: this.getHeader,
        })
        .json()

      if (variations.response_description === '000') {
        return {
          success: true,
          variations: variations?.content?.varations,
        }
      } else {
        console.log(variations)
        response.safeStatus(400)
        return {
          success: false,
          message: variations.content.errors,
        }
      }
    } catch (error) {
      response.safeStatus(500)
      return {
        success: false,
        message: 'An error occurred',
      }
    }
  }
}
