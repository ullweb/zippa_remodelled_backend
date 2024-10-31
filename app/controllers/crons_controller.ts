import Autosave from '#models/autosave'
// import type { HttpContext } from '@adonisjs/core/http'
import cronstrue from 'cronstrue'
import { differenceInMinutes, format } from 'date-fns'
import {
  dailyAutoSave,
  monthlyBenefits,
  monthlyKiddies,
  scheduleFlex,
} from '#services/cron_service'
import Benefit from '#models/benefit'
import Kiddy from '#models/kiddy'
import FlexSave from '#models/flex_save'
import FixedLock from '#models/fixed_lock'

export default class CronsController {
  /**
   * this cron would be run every 30 minutes
   */
  async runDailyCron() {
    const autosaves = await Autosave.findManyBy({ status: 'ongoing' })
    autosaves.forEach(async (save) => {
      const cron = this.convertCronToDate(save.cron)
      if (save.frequency === 'daily') {
        if (differenceInMinutes(new Date(), cron) < 10) {
          await dailyAutoSave(save.id)
        }
      }
    })
    return {
      success: true,
    }
  }
  /**
   * This Job would be run every day at 7 am
   */
  async runBenefitCron() {
    const benefits = await Benefit.findManyBy({ status: 'ongoing' })
    const kiddies = await Kiddy.findManyBy({ status: 'ongoing' })
    const locks = await FixedLock.findManyBy({ status: 'ongoing' })
    const autosaves = await Autosave.findManyBy({ status: 'ongoing' })

    autosaves.forEach(async (save) => {
      if (save.frequency === 'weekly') {
        const cron = this.convertCronToWeek(save.cron)
        if (format(new Date(), 'EEEE') === cron) {
          await dailyAutoSave(save.id)
        }
      }
      if (save.frequency === 'monthly') {
        const cron = this.convertCronToDay(save.cron)
        if (new Date().getDate() === cron.getDate()) {
          await dailyAutoSave(save.id)
        }
      }
    })
    benefits.forEach(async (benefit) => {
      const cron = this.convertCronToDay(benefit.cron)
      if (new Date().getDate() === cron.getDate()) {
        await monthlyBenefits(benefit.id)
      }
    })
    kiddies.forEach(async (kiddy) => {
      const cron = this.convertCronToDay(kiddy.cron)
      if (new Date().getDate() === cron.getDate()) {
        await monthlyKiddies(kiddy.id)
      }
    })

    locks.forEach(async (lock) => {
      const cron = this.convertCronToDate(lock.endDate)
      if (differenceInMinutes(new Date(), cron) < 10) {
        await dailyAutoSave(lock.id)
      }
    })
    return {
      success: true,
    }
  }

  /**
   * this cron would be run every month at 7 am
   * runMonthlyFlex
   */
  public async runMonthlyFlex() {
    const flexes = await FlexSave.findManyBy({ status: 'ongoing' })
    flexes.forEach(async (flex) => {
      await flex.userId
    })
    return {
      success: true,
    }
  }

  private convertCronToDate(expression: string) {
    const cron = cronstrue.toString(expression)
    const d = new Date()
    const parts = RegExp(/(\d+):(\d+) (\w+)/).exec(cron) ?? []
    const hours = /am/i.test(parts[3]) ? parseInt(parts[1], 10) : parseInt(parts[1], 10) + 12
    const minutes = parseInt(parts[2], 10)
    d.setHours(hours, minutes, 0, 0)
    return d
  }

  private convertCronToWeek(expression: string) {
    const cron = cronstrue.toString(expression)
    const day = cron.split(' ').at(-1)
    return day
  }

  private convertCronToDay(expression: string) {
    const cron = cronstrue.toString(expression)
    const d = new Date()
    const parts = RegExp(/day (\d+)/).exec(cron) ?? []
    const day = parseInt(parts[1], 10)
    d.setDate(day)
    return d
  }
}
