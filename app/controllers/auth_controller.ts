import logger from '@adonisjs/core/services/logger'
import User from '#models/user'
import { HttpContext } from '@adonisjs/core/http'
import Case from 'case'
import {
  accountValidator,
  bvnValidator,
  emailValidator,
  loginValidator,
  registerValidator,
  updatePinValidator,
  verifyValidator,
} from '#validators/auth'
import mail from '@adonisjs/mail/services/main'
import Wallet from '#models/wallet'
import limiter from '@adonisjs/limiter/services/main'
import axios from 'axios'
import { StatusCodes } from 'http-status-codes'
import hash from '@adonisjs/core/services/hash'

export default class AuthController {
  async register({ request }: HttpContext) {
    logger.info('registration route')

    const data = await request.validateUsing(registerValidator)
    const verificationCode = Math.floor(1000 + Math.random() * 9000)
    const user = await User.create({
      verificationCode,
      name: Case.capital(data.name),
      email: data.email,
      phone: data.phone,
      password: data.password,
      username: data.username,
      image:
        'https://res.cloudinary.com/dlupy45xp/image/upload/v1721831826/zippa/wubkucrhehiuvjaa7es5.png',
    })

    await mail.send((message) => {
      message.to(user.email).subject('Zippa Verification Code').html(`
          Hello ${user.name},<p> Your verification code.</p>
        <span style="font-size:32;font-weight:bold; text-align:center;width:100%">${verificationCode}</span>
          `)
    })
    const token = await User.accessTokens.create(user, ['*'], {
      expiresIn: '7 days',
    })
    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        // type: user.type,
        token: token.toJSON().token,
      },
      message: 'Verification code sent to user email',
    }
  }

  async login({ request }: HttpContext) {
    logger.info('this is login route')

    const { email, password } = await request.validateUsing(loginValidator)
    /**
     * create a limiter
     */
    const loginLimiter = limiter.use({
      requests: 5,
      duration: '1 min',
      blockDuration: '20 min',
    })

    /**
     * Use IP address + email combination. this ensures if an
     * attacker is misusing emails; we do not block actual
     * users from logging in and only penalize the attacker
     * IP address
     */
    const key = `login_${request.ip()}_${email}`

    /**
     * Wrap User.VerifyCredentials inside the penalize method, so
     * that we consume one request for every invalid credentials
     * error
     */
    const [error, user] = await loginLimiter.penalize(key, () => {
      return User.verifyCredentials(email, password)
    })
    /**
     * On ThrottleException, redirect the user back with an error
     * message about being block for a certain amount of minutes
     */
    if (error) {
      return {
        success: false,
        message: `Too many login request, try again after ${error.response.availableIn} seconds`,
      }
    }
    // const user = await User.verifyCredentials(email, password)
    if (user) {
      if (!user.verified) {
        const verificationCode = Math.floor(1000 + Math.random() * 9000)
        const user = await User.query().where('email', email).update({ verificationCode }).first()

        await mail.send((message) => {
          message.to(user.email).subject('Zippa Verification Code').html(`
            Hello ${user.name},<p> Your verification code.</p>
          <span style="font-size:32;font-weight:bold; text-align:center;width:100%">${verificationCode}</span>
            `)
        })
        return {
          success: false,
          message: 'User not verified, verification code sent to email',
        }
      }
      const token = await User.accessTokens.create(user, ['*'], {
        expiresIn: '7 days',
      })

      return {
        success: true,
        user,
        token: token.toJSON().token,
      }
    }
  }

  async resendVerificationCode({ request, response }: HttpContext) {
    logger.info('verification code resend route')

    const { email } = await request.validateUsing(emailValidator)
    const verificationCode = Math.floor(1000 + Math.random() * 9000)
    const user = await User.query().where('email', email).first()
    if (user) {
      // console.log(user, email)
      user.verificationCode = verificationCode
      await user.save()
      await mail
        .send((message) => {
          message.to(user.email).subject('Zippa Verification Code').html(`
          Hello ${user.name},<p> Your verification code.</p>
        <span style="font-size:32;font-weight:bold; text-align:center;width:100%">${verificationCode}</span>
          `)
        })
        .catch((err) => {
          logger.error({ err: err }, 'Something went wrong')
          response.safeStatus(500)
          return {
            success: false,
            message: err,
          }
        })
    } else {
      response.safeStatus(400)
      return {
        success: false,
        message: 'User not found for ' + email,
      }
    }

    return {
      success: true,
      message: 'Verification code resent to email',
    }
  }

  async confirmVerification({ request }: HttpContext) {
    logger.info('verification code resend route')

    const { email, code } = await request.validateUsing(verifyValidator)
    const user = await User.query().where('email', email).first()

    if (user) {
      const dbCode = user?.verificationCode
      if (dbCode !== code) {
        logger.error({ err: 'in valid code' }, 'Something went wrong')
        return {
          success: false,
          message: 'Invalid code',
        }
      }
      user.verified = true
      await user.save()
      const wallet = await Wallet.create({
        walletBalance: 0,
        userId: user.id,
        walletNumber: user.phone.slice(1, 11),
      })

      const token = await User.accessTokens.create(user, ['*'], {
        expiresIn: '7 days',
      })
      await mail.send((message) => {
        message.to(user.email).subject('Welcome to Zippa Wallet - Start Saving Today!').html(`
            <h4>Dear ${user.name},</h4>
            <p>A warm welcome to Zippa Wallet, your go-to platform for convenient VTU purchases and smart money-saving solutions!</p>
            <p>We're excited to have you on board and help you achieve your financial goals. With our app, you can:</p>
            <ul>
              <li>Easily buy airtime, data, electricity and subscribe to cable for yourself or loved ones</li>
              <li>Enjoy exclusive discounts and promotions</li>
              <li>Track your expenses and stay on top of your finances</li>
            </ul>
            <p>Get started now and discover a smarter way to manage your money!</p>
            <p>Best regards,<br/>
              The Zippa Wallet Team
              </p>
            `)
      })

      return {
        success: true,
        message: 'Code successfully verified',
        user,
        token: token.toJSON().token,
        wallet,
      }
    }
    logger.error({ err: 'no user found' }, 'Something went wrong')
    return {
      success: false,
      message: 'User not found',
    }
  }
  async editAccount({ auth, response, request }: HttpContext) {
    logger.info('this is update account detail route')
    await auth.check()
    const user = auth.user

    if (!user) {
      logger.error({ err: 'no user found' }, 'Something went wrong')
      return {
        success: false,
        message: 'no user found',
      }
    }

    let field = request.input('field')
    switch (field) {
      case 'email':
        const { email } = await request.validateUsing(accountValidator)
        const isEmailAvailable = await User.query()
          .select('id')
          .where({ email })
          .whereNot('id', user.id)
          .first()
        if (isEmailAvailable) {
          return response.safeStatus(422).json({
            success: false,
            errors: [
              {
                message: 'This Email has been used by someone else',
                field: 'email',
              },
            ],
          })
        }
        user.email = email ?? ''
        break
      case 'phone':
        const { phone } = await request.validateUsing(accountValidator)
        const isAvailable = await User.query()
          .select('id')
          .where({ phone })
          .whereNot('id', user.id)
          .first()
        if (isAvailable) {
          return response.safeStatus(422).json({
            success: false,
            errors: [
              {
                message: 'This Phone Number has been used by someone else',
                field: 'phone',
              },
            ],
          })
        }
        user.phone = phone ?? ''
        break
      case 'dob':
        const { dob } = await request.validateUsing(accountValidator)
        user.dob = dob ?? ''
        break
      case 'address':
        const { address } = await request.validateUsing(accountValidator)
        user.address = address ?? ''
        break
      case 'username':
        const { username } = await request.validateUsing(accountValidator)
        const isUsernameAvailable = await User.query()
          .select('id')
          .where({ username })
          .whereNot('id', user.id)
          .first()
        if (isUsernameAvailable) {
          return response.safeStatus(422).json({
            success: false,
            errors: [
              {
                message: 'This Username has been used by someone else',
                field: 'username',
              },
            ],
          })
        }
        user.username = username ?? ''
        break

      default:
        break
    }
    await user.save()

    return {
      success: true,
      message: 'User Details Updated Successfully',
      user,
    }
  }

  async createPin({ auth, request }: HttpContext) {
    logger.info('this is create pin route')
    await auth.check()
    const user = auth.user

    if (!user) {
      logger.error({ err: 'no user found' }, 'Something went wrong')
      return {
        success: false,
        message: 'no user found',
      }
    }

    const pin = request.input('pin')
    const hashedPin = await hash.make(pin)
    user.pin = hashedPin
    await user.save()

    return {
      success: true,
      message: 'Pin has been created successfully',
    }
  }

  async verifyPin({ auth, response, request }: HttpContext) {
    logger.info('this is verify pin route')
    await auth.check()
    const user = auth.user

    if (!user) {
      logger.error({ err: 'no user found' }, 'Something went wrong')
      return {
        success: false,
        message: 'no user found',
      }
    }
    if (user.pin) {
      const pin = request.input('pin')
      const isPinCorrect = await hash.verify(user.pin, pin)
      if (isPinCorrect) {
        return {
          success: true,
          message: 'PIN Verified',
        }
      } else {
        response.safeStatus(400).json({
          success: false,
          message: 'Invalid PIN',
        })
      }
    } else {
      response.safeStatus(400).json({
        success: false,
        message: 'PIN not set',
      })
    }
  }

  async updatePin({ auth, response, request }: HttpContext) {
    logger.info('this is verify pin route')
    await auth.check()
    const user = auth.user

    if (!user) {
      logger.error({ err: 'no user found' }, 'Something went wrong')
      return {
        success: false,
        message: 'no user found',
      }
    }

    const { oldPin, newPin } = await request.validateUsing(updatePinValidator)
    if (user.pin) {
      const isPinValid = await hash.verify(user.pin, oldPin)
      if (isPinValid) {
        user.pin = await hash.make(newPin)
        await user.save()
        return {
          success: true,
          message: 'PIN Updated',
        }
      } else {
        response.safeStatus(400).json({
          success: false,
          message: 'Invalid PIN',
        })
      }
    } else {
      response.safeStatus(400).json({
        success: false,
        message: 'PIN not set',
      })
    }
  }

  async logout({ auth }: HttpContext) {
    logger.info('this is logout route')
    await auth.check()
    const user = auth.user

    if (!user) {
      logger.error({ err: 'no user found' }, 'Something went wrong')
      return {
        success: false,
        message: 'no user found',
      }
    }

    await User.accessTokens.delete(user, user.currentAccessToken.identifier)

    return { success: true, message: 'success' }
  }
  verifyBVN = async ({ auth, request, response }: HttpContext) => {
    await auth.check()
    const user = auth.user
    if (!user) {
      response.safeStatus(419)
      return { success: false, message: 'user not authenticated' }
    }
    const { id } = user
    const { bvn } = await request.validateUsing(bvnValidator)

    // const user = await User.findOne({ email })
    try {
      if (!user.dob) {
        throw new Error('Please complete your profile, provide your date of birth')
      }
      if (!user.name.split(' ')[0] || !user.name.split(' ')[1]) {
        throw new Error('Please provide your first and last name on profile')
      }
      if (user.bvnVerified) {
        throw new Error('BVN already verified')
      }
    } catch (error) {
      response
        .safeStatus(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ success: false, message: error })
    }

    const dob = new Date(user.dob)
    const dobFormatted = `${dob.getDate()}-${dob.getMonth() + 1}-${dob.getFullYear()}`

    const options = {
      method: 'POST',
      url: 'https://api.verified.africa/sfx-verify/v3/id-service/',
      headers: {
        'accept': 'application/json',
        'userid': process.env.SEAMFIX_USER_ID,
        'apiKey': process.env.SEAMFIX_API_KEY,
        'content-type': 'application/json',
      },
      data: {
        firstName: user.name.split(' ')[0],
        lastName: user.name.split(' ')[1],
        searchParameter: bvn,
        dob: dobFormatted,
        verificationType: 'BVN-BOOLEAN-MATCH',
      },
    }

    axios
      .request(options)
      .then(async function (resp) {
        console.log(resp)
        if (resp.data.verificationStatus === 'VERIFIED') {
          const updatedUser = await User.query().where('id', id).update({ bvnVerified: true })

          return { message: 'BVN verified', user: updatedUser }
        } else {
          let detailsMessage = ''
          const details = resp.data.response
          if (details) {
            const invalidDetails = Object.keys(details).filter((key) => !details[key])
            if (invalidDetails.length) {
              detailsMessage = ': ' + invalidDetails.join(', ').replace(/valid/gi, '')
            }
          }
          response.safeStatus(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: `BVN not verified, incorrect details${detailsMessage} `,
          })
        }
      })
      .catch(function (error) {
        console.log(error.response.data)
        response
          .safeStatus(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ success: false, message: error?.response?.data?.description })
      })
  }
}
