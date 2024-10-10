import Autosave from '#models/autosave'
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

export const getCronExpression = (
  frequency: string,
  timeOfDay: string,
  dayOfWeek: number,
  dayOfMonth: number
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
      return `${cronTime} * * ${dayOfWeek || 0}` // Weekly on specified day and time
    case 'monthly':
      return `${cronTime} ${dayOfMonth || 1} * *` // Monthly on specified day and time
    default:
      return 'Invalid frequency'
    // throw new BadRequestError();
  }
}

export const getSavingsTotal = async (id: number) => {
  // const thriftSaves = await ThriftSave.find({ user: id })
  //   const flexSave = await FlexSave.findOne({ user: id })
  const autoSaves = await Autosave.findManyBy({ userId: id, status: 'ongoing' })
  // const fixedLocks = await FixedLock.find({ user: id })
  // const benefitsSaves = await Benefit.find({ user: id })
  // const kidsSaves = await Kiddies.find({ user: id })

  let total = 0
  let target = 0
  // thriftSaves.forEach((thriftSave) => {
  //   total += thriftSave.amount
  // })
  autoSaves.forEach((autoSave) => {
    target += autoSave.current
    total += autoSave.current
  })
  // fixedLocks.forEach((fixedLock) => {
  //   total += fixedLock.amount
  // })
  // benefitsSaves.forEach((benefit) => {
  //   total += benefit.current
  // })
  // kidsSaves.forEach((kid) => {
  //   total += kid.current
  // })
  // total += flexSave?.amount

  return { total, target }
}
