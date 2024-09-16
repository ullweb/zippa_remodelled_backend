import https from 'https'
import sendFailedCardDebitEmail from '../../utils/sendFailedCardDebitEmail'
import Transaction from '#models/transaction'
import env from '#start/env'
import { Paystack } from 'paystack-sdk'

const paystack = new Paystack(env.get('PAYSTACK_SECRET_KEY')!)

paystack.transaction.chargeAuthorization({})

const debitCard = async (data: {
  authorization_code: any
  email: any
  amount: number
  title: any
  userId: any
  name: any
}) => {
  const params = JSON.stringify({
    authorization_code: data.authorization_code,
    email: data.email,
    amount: data.amount * 100,
  })

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: '/transaction/charge_authorization',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.get('PAYSTACK_SECRET_KEY')}`,
      'Content-Type': 'application/json',
    },
  }

  const paystackReq = https
    .request(
      options,
      (paystackRes: {
        on: (arg0: string, arg1: { (chunk: any): void; (): Promise<any> }) => void
      }) => {
        let data = ''

        paystackRes.on('data', (chunk: string) => {
          data += chunk
        })

        paystackRes.on('end', async () => {
          const response = JSON.parse(data)
          await Transaction.create({
            user: data.userId,
            username: data.name,
            amount: data.amount,
            title: data.title,
            type: 'debit',
            status: 'success',
          })
          return response
        })
      }
    )
    .on('error', async (error: any) => {
      console.error(error)
      await sendFailedCardDebitEmail({
        email: data.email,
        title: data.title,
        amount: data.amount,
      })
      await Transaction.create({
        user: data.userId,
        username: data.name,
        amount: data.amount,
        title: data.title,
        type: 'debit',
        status: 'failed',
      })
      res.status(500).json({
        error: 'An error occurred while charging the card',
      })
    })

  paystackReq.write(params)
  paystackReq.end()
}

module.exports = { debitCard }
