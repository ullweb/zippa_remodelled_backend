import User from '#models/user'
import logger from '@adonisjs/core/services/logger'
import mail from '@adonisjs/mail/services/main'

export const sendMail = async (email: { subject: string; message: string }, user: User) => {
  await mail
    .send((message) => {
      message.to(user.email).subject(email.subject).html(email.message)
    })
    .catch((err) => {
      logger.error({ err: err }, 'Something went wrong')
      // response.safeStatus(500)
      return {
        success: false,
        message: err,
      }
    })
}

export const sendFailedDebitEmail = async (email: string, title: string, amount: number) => {
  await mail
    .send((message) => {
      message
        .to(email)
        .subject(`Failed Debit ${title}`)
        .html(
          `
          <body>
          <h1>Hello there, </h1>
          <p>Unfortunately, we were unable to debit your wallet for the ${title} of ₦${amount}.</p>
          <p>Please ensure you have enough funds in your account and try again.</p>
          <p>If you have any questions, please contact us at <a href="mailto:support@zippawallet.com">zippawallet.com</a></p>
          <p>Thank you.</p>
          <br />
          <br />
          <p>Best regards,</p>
          </body>
        `
        )
    })
    .catch((err) => {
      logger.error({ err: err }, 'Something went wrong')
      // response.safeStatus(500)
      return {
        success: false,
        message: err,
      }
    })
}
