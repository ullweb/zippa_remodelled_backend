/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

const AuthController = () => import('#controllers/auth_controller')
const BillsController = () => import('#controllers/bills_controller')
import router from '@adonisjs/core/services/router'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})
router.post('/auth/register', [AuthController, 'register']).as('auth.register')
router.post('/auth/login', [AuthController, 'login']).as('auth.login')
router
  .post('/auth/resend-verification-code', [AuthController, 'resendVerificationCode'])
  .as('auth.resend-code')
router
  .post('/auth/confirm-verification', [AuthController, 'confirmVerification'])
  .as('auth.confirm-code')

router.post('/bills/airtime', [BillsController, 'buyAirtime']).as('bills.airtime')
router.post('/bills/data', [BillsController, 'buyData']).as('bills.data')
router.post('/bills/cable', [BillsController, 'subscribeCable']).as('bills.cable')
router.post('/bills/electricity', [BillsController, 'buyElectricity']).as('bills.electricity')
router.post('/bills/meter', [BillsController, 'verifyMeter']).as('bills.meter')
router.post('/bills/verify', [BillsController, 'verifyCustomer']).as('bills.verify')
router.get('/bills/variations/:id', [BillsController, 'getVariations']).as('bills.variations')
