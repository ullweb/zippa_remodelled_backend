import scheduler from 'adonisjs-scheduler/services/main'

// scheduler.command('inspire').everyFiveSeconds()

scheduler.command('target', ['1']).everyFiveSeconds()
scheduler
  .call(() => {
    console.log('Purge DB!')
  })
  .weekly()
