import { SCHEDULE_BUFFER_SIZE, SCRIPT_COSTS } from 'core/globals'
import { StorageEntry } from 'core/storage-entry'
import { Task, Pipeline } from 'core/queue'

export class Schedule extends StorageEntry {
  static storageKey = 'State.Schedule'
	static storageValue = Schedule
  buffer      = new Array(SCHEDULE_BUFFER_SIZE)
  batches     = new Map()

  constructor() { 
    super()

    this.isDirty = false
  }

  add(ns, time, duration, script, memSpace, threads, args) {
    console.log(`SCHEDULE: ${time} ${duration} ${script} ${memSpace} ${threads} ${JSON.stringify(args)}`)

    let entry = { script: script, threads: threads, memSpace: memSpace, args: args },
        target = args[0]

    let added = false
    for (let i = 0; i < SCHEDULE_BUFFER_SIZE; i++) {
      if (this.buffer[i] == null) {
        this.buffer[i] = { time: time, duration: duration, exec: entry }
        added = true
        break
      } else if (this.buffer[i].time > time) {
        this.buffer.splice(i, 0, { time: time, duration: duration, exec: entry })
        added = true
        break
      }
    }

    if (added) {
      this.isDirty = true
      let beforeT = this.batches.has(args) ? this.batches.get(target) : 0
      if (beforeT < time+duration) this.batches.set(target, time+duration)
    }

    return added
  }

  tick(ns, plan) {
    let doneI = -1
    for (let i = 0; i < SCHEDULE_BUFFER_SIZE; i++) {
      let entry = this.buffer[i]
      if (entry == null) {
        //ns.tprint("  ...No more entries")
        break
      }
      if (entry != null && entry.time > Date.now()) {
        //ns.tprint("  ...Waiting for ", entry.exec.script, " on ", entry.time, ' DELTA: ', entry.time - Date.now())
        break
      }
      
      //ns.tprint("  Checking ", entry.exec.script, " on ", entry.time, ' DELTA: ', entry.time - Date.now())

      if (entry.time <= Date.now()) {
        //ns.tprint("    Executing ", entry.exec.script, " with ", JSON.stringify(entry.exec.args))
        this.deployEntry(ns, plan, entry.exec, `${entry.exec.args[0]}_${entry.time}`)
        doneI = i
      }
    }


    if (doneI < 0) return

    this.buffer.splice(0, doneI+1)
    this.isDirty = true
    
    plan.save()
    this.save()
  }

  deployEntry(ns, plan, exec, uid) {
    if (exec.args.length < 1) return false
    
    let key = 'Harvest -'+exec.args[0]+'-', script = '/worker/'+exec.script+'.js'
    if (!plan.network.has(key))
          plan.network.appendEntry(new Pipeline('Sync', [], key))

   // ns.tprint('    Deploy ',key, ' with ', script, ' on ', entry.threads, ' threads with ', JSON.stringify(entry.args))

    let task = new Task(script, SCRIPT_COSTS[script], exec.memSpace, exec.threads, exec.args)
    task.UID = uid

    plan.network
    .get(key)
    .appendEntry(new Task(script, SCRIPT_COSTS[script], exec.memSpace, exec.threads, exec.args))
  }

  save() {
    if (!this.isDirty) return

    this.isDirty = false
    Schedule.save(this)
  }
}