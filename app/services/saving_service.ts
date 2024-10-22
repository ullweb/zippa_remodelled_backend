import Autosave from '#models/autosave'
import Benefit from '#models/benefit'
import FixedLock from '#models/fixed_lock'
import FlexSave from '#models/flex_save'
import Kiddy from '#models/kiddy'
import ThriftSave from '#models/thrift_save'
import cronParser from 'cron-parser'
export const matchCronExpression = (cronExpression: string) => {
  try {
    const now = new Date()
    const cronJob = cronParser.parseExpression(cronExpression)
    const nextExecution = cronJob.next().toDate()

    const tolerance = 1000 * 59

    return Math.abs(now.getTime() - nextExecution.getTime()) <= tolerance
  } catch (error) {
    console.error(`Error parsing cron expression: ${cronExpression}`, error)
    return false
  }
}

export const calculateInitialStartTime = (
  startDate: string | number | Date,
  frequency: any,
  timeOfDay: string,
  dayOfWeek: number,
  dayOfMonth: number
) => {
  let initialStart = new Date(startDate)
  if (timeOfDay) {
    const [hour, minute] = timeOfDay.split(':')
    initialStart.setHours(parseInt(hour))
    initialStart.setMinutes(parseInt(minute))
    initialStart.setSeconds(0)
  } else {
    initialStart.setHours(7)
    initialStart.setMinutes(0)
    initialStart.setSeconds(0)
  }

  switch (frequency) {
    case 'weekly':
      const day = initialStart.getDay()
      const targetDay = dayOfWeek || 0
      const diff = (targetDay - day + 7) % 7
      initialStart.setDate(initialStart.getDate() + diff)
      break
    case 'monthly':
      const monthDay = dayOfMonth || 1
      if (initialStart.getDate() > monthDay) {
        initialStart.setMonth(initialStart.getMonth() + 1)
      }
      initialStart.setDate(monthDay)
      break
  }
  return initialStart
}
export const dateToCron = (date: Date): string => {
  const minutes = date.getMinutes()
  const hours = date.getHours()
  const days = date.getDate()
  const months = date.getMonth() + 1
  const dayOfWeek = date.getDay()

  return `${minutes} ${hours} ${days} ${months} ${dayOfWeek}`
}

export const getCronExpression = (
  frequency: string,
  timeOfDay: string = '7:00',
  dayOfWeek: number = 0,
  dayOfMonth: number = 1
) => {
  let cronTime = '0 7' // Default to 7:00 AM

  if (timeOfDay) {
    const [hour, minute] = timeOfDay.split(':')
    cronTime = `${minute} ${hour}`
  }

  switch (frequency) {
    case 'hourly':
      return '0 * * * *' // Every hour at minute 0
    case 'daily':
      return `${cronTime} * * *` // Daily at specified time
    case 'weekly':
      return `${cronTime} * * ${dayOfWeek}` // Weekly on specified day and time
    case 'monthly':
      return `${cronTime} ${dayOfMonth} * *` // Monthly on specified day and time
    default:
      return 'Invalid frequency'
    // throw new BadRequestError();
  }
}

export const getSavingsTotal = async (id: number) => {
  const thriftSaves = await ThriftSave.findManyBy({ userId: id, status: 'ongoing' })
  const flexSave = await FlexSave.find({ userId: id })
  const autoSaves = await Autosave.findManyBy({ userId: id, status: 'ongoing' })
  const fixedLocks = await FixedLock.findManyBy({ userId: id, status: 'ongoing' })
  const benefitsSaves = await Benefit.findManyBy({ userId: id, status: 'ongoing' })
  const kidsSaves = await Kiddy.findManyBy({ userId: id, status: 'ongoing' })

  let total = 0
  let target = 0
  thriftSaves.forEach((thriftSave) => {
    total += thriftSave.amount
  })
  autoSaves.forEach((autoSave) => {
    target += autoSave.current
    total += autoSave.current
  })
  fixedLocks.forEach((fixedLock) => {
    total += fixedLock.amount
  })
  benefitsSaves.forEach((benefit) => {
    total += benefit.current
  })
  kidsSaves.forEach((kid) => {
    total += kid.current
  })
  total += flexSave?.amount ?? 0

  return { total, target }
}
