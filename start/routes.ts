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
const HomeController = () => import('#controllers/home_controller')
const DepositsController = () => import('#controllers/deposits_controller')
const AutosavesController = () => import('#controllers/autosaves_controller')
const SavingsController = () => import('#controllers/savings_controller')
const FlexesController = () => import('#controllers/flexes_controller')
const LocksController = () => import('#controllers/locks_controller')
import router from '@adonisjs/core/services/router'

router.get('/', async () => {
  return {
    success: true,
    message: 'Zippa Wallet',
  }
})
router
  .group(() => {
    router.post('/auth/register', [AuthController, 'register']).as('auth.register')
    router.post('/auth/login', [AuthController, 'login']).as('auth.login')
    router
      .post('/auth/resend-verification-code', [AuthController, 'resendVerificationCode'])
      .as('auth.resend-verification-code')
    router
      .post('/auth/confirm-verification', [AuthController, 'confirmVerification'])
      .as('auth.confirm-code')
    router.post('/auth/logout', [AuthController, 'logout']).as('auth.logout')
    router.post('/auth/verify-bvn', [AuthController, 'verifyBVN']).as('auth.verify-bvn')
    router.put('/auth/account', [AuthController, 'editAccount']).as('auth.edit-account')
    router.post('/auth/create-pin', [AuthController, 'createPin']).as('auth.create-pin')
    router.post('/auth/verify-pin', [AuthController, 'verifyPin']).as('auth.verify-pin')
    router.post('/auth/update-pin', [AuthController, 'updatePin']).as('auth.update-pin')
    router.post('/auth/reset-mail', [AuthController, 'resetMail']).as('auth.reset-mail')
    router.post('/auth/resend-code', [AuthController, 'resendCode']).as('auth.resend-code')
    router.post('/auth/verify-code', [AuthController, 'verifyCode']).as('auth.verify-code')
    router.post('/auth/reset-password', [AuthController, 'passwordReset']).as('auth.reset-password')

    router.get('/home', [HomeController, 'index']).as('home.index')

    router.post('/bills/airtime', [BillsController, 'buyAirtime']).as('bills.airtime')
    router.post('/bills/data', [BillsController, 'buyData']).as('bills.data')
    router.post('/bills/cable', [BillsController, 'subscribeCable']).as('bills.cable')
    router.post('/bills/electricity', [BillsController, 'buyElectricity']).as('bills.electricity')
    router.post('/bills/meter', [BillsController, 'verifyMeter']).as('bills.meter')
    router.post('/bills/verify', [BillsController, 'verifyCustomer']).as('bills.verify')
    router.get('/bills/variations/:id', [BillsController, 'getVariations']).as('bills.variations')
    router.get('/bills/transactions', [BillsController, 'getTransactions']).as('bills.transactions')

    router.get('/wallet', [DepositsController, 'getWallet'])
    // router.get('/wallet/savings', [DepositsController, 'getSavingsTotal'])
    router.post('/wallet/topup', [DepositsController, 'initiateTopup'])
    router.post('/wallet/verify/:id', [DepositsController, 'verifyTopup'])
    // router.post('/wallet/verify-mobile/:id', [DepositsController, 'verifyTopupMobile'])
    // router.get('/wallet/cards', [DepositsController, 'getCards'])
    router.get('/wallet/transactions', [DepositsController, 'getTransactions'])

    router.get('/savings', [SavingsController, 'index'])

    router.get('/savings/target', [AutosavesController, 'index'])
    router.post('/savings/target/autosaves', [AutosavesController, 'createAutoSave'])

    router.post('/savings/target/flex', [FlexesController, 'topupFlex'])
    router.patch('/savings/target/flex/withdraw', [FlexesController, 'withdrawFlex'])
    router.get('/flex/transactions', [FlexesController, 'getFlexTransactions'])

    //     router.get("/savings/flex", [, 'getFlexTotal']);
    // router.get("/savings/flex/transactions", [, 'getFlexTrans'])
    // router.patch("/savings/flex", [, 'topupFlex']);
    // router.get("/savings/flex/withdraw-date", [, 'getWithdrawDate']);
    // router.patch("/savings/flex/withdraw", [, 'withdrawFlex']);

    router.post('/savings/fixed', [LocksController, 'createFixedLock'])
    router.get('/savings/fixed', [LocksController, 'getFixedLocks'])
    router.get('/savings/fixed/total', [LocksController, 'getFixedLockTotal'])
    router.get('/savings/fixed/:id', [LocksController, 'getFixedLock'])

    router.post('/savings/benefit', [LocksController, 'createBenefit'])
    router.get('/savings/benefit', [LocksController, 'getBenefits'])
    router.get('/savings/benefit/total', [LocksController, 'getBenefitTotal'])
    router.get('/savings/benefit/:id', [LocksController, 'getBenefit'])

    router.post('/savings/kiddies', [LocksController, 'createKiddies'])
    router.get('/savings/kiddies', [LocksController, 'getKiddiesAll'])
    router.get('/savings/kiddies/total', [LocksController, 'getKiddiesTotal'])
    router.get('/savings/kiddies/:id', [LocksController, 'getKiddies'])

    router.post('/savings/thrift', [LocksController, 'createThriftSave'])
    router.get('/savings/thrift', [LocksController, 'getThriftSaves'])
    router.get('/savings/thrift/total', [LocksController, 'getThriftTotal'])
    router.patch('/savings/thrift/withdraw/:id', [LocksController, 'withdrawThrift'])
    router.get('/savings/thrift/:id', [LocksController, 'getThriftSave'])
  })
  .prefix('api')
