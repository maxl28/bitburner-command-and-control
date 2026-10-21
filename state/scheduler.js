import { nextID, releaseID } from 'core/util'
import { StorageEntry } from 'core/storage-entry'
import { CC_CYCLE_PAUSE } from 'core/globals'
import { Batch, Task } from 'core/batch'

export class Scheduler extends StorageEntry {

  static storageKey = 'State.Scheduler'
  static storageValue = Scheduler

  target_batches = new Map()

  batch_target = new Array(5000)

  batch_tasks = new Array(5000)

  batches = new Array(5000)

  /**
   * List of this.batches indexes
   */
  running_batches = []

  batch_schedule = []
  task_schedule = []

  tasks = new Array(5000)
  /**
   * List of this.tasks indexes
   */
  running_tasks = []


  constructor() {
    super()
  }

  tick(ns, memory) {
    const now = Date.now()
    
    while ( 
      this.batch_schedule.length > 0 && 
      this.batch_schedule[0][0] < (now - .4*CC_CYCLE_PAUSE) 
    ) {
      const [timestamp, batches] = this.batch_schedule.shift()

      //ns.tprint("SCHEDULER: BATCHES ", timestamp, " with ", batches.length, " batches")
      for (let batch_id of batches) {
        if (this.dispatchBatch(batch_id)) continue

        // ToDo: Reschedule failed batches
        //ns.tprint(`SCHEDULER: Failed to dispatch batch[${batch_id}] targeting ${this.batches[batch_id].target}`)
        this.removeBatch(batch_id)
      }
      //ns.tprint(" >> running batches: ", this.running_batches.length)
    }

    while ( 
      this.task_schedule.length > 0 && 
      this.task_schedule[0][0] < (now - .4*CC_CYCLE_PAUSE) 
    ) {
      const [timestamp, tasks] = this.task_schedule.shift()

      //ns.tprint("SCHEDULER: TASKS", timestamp, ' with ', tasks.length, " tasks")

      this.running_tasks.push(...tasks)
    }

    let running = []
    while (this.running_tasks.length > 0) {
      let task_id = this.running_tasks.shift(),
          task    = this.tasks[task_id]

      if (
        task.tick(ns, memory) && 
        task.isDead(memory)) this.removeTask(task_id)
      else running.push(task_id)

   }
1
    this.running_tasks = running
  }

  /**
   * @param {number} timestamp
   * @returns {number} 
   */
  consumptionAt(timestamp) {
    /**
     * Bucket for all running batches at this timestamp.
     */
    let sum_batches = []

    /**
     * Total RAM consumption of all sheduled batches at this timestamp.
     */
    for (let [startAt, batches] of this.batch_schedule) {
      if (startAt > timestamp) break;

      batches.filter(batch_id => {
        let batch = this.batches[batch_id]
        if (batch == null) return false

        let [bStart, bEnd] = batch.runtime()
        return (timestamp >= bStart && timestamp <= bEnd)
      })

      sum_batches.push(...batches)
    }

    /**
     * Include currently running batches if they meet the criteria
     */
    for (let batch_id of this.running_batches) {
      let batch = this.batches[batch_id]
      if (batch == null) continue

      let [bStart, bEnd] = batch.runtime()
      if (timestamp >= bStart && timestamp <= bEnd) {
        sum_batches.push(batch_id)
      }
    }

    /**
     * Return total RAM consumption of all batches at this timestamp.
     */
    return sum_batches.reduce(
      (ag, batch_id) => ag+this.batches[batch_id].consumption(),
      0
    )
  }
  addBatch(ns, batch, exec_at) {
    let target = batch.target

    if (!this.target_batches.has(target)) this.target_batches.set(target, [])

    const batch_id = nextID(this.batches)
    batch.id = batch_id
    this.batches[batch_id] = batch

    this.target_batches.set(
      target, 
      [...this.target_batches.get(target), batch_id]
    )

    this.batch_target[batch_id] = target

    let added = false
    for (let i=0;i<this.batch_schedule.length;i++) {
      let el = this.batch_schedule[i]

      if (el[0] < exec_at) continue;
      if (el[0] == exec_at) {
        this.batch_schedule[i][1].push(batch_id)
        added = true
        break
      }
      if (el[0] > exec_at) {
        this.batch_schedule.splice(i, 0, [exec_at, [batch_id]])
        added = true
        break
      }
    }

    if (!added) {
       this.batch_schedule.push( [exec_at, [batch_id]] )
    }

    //console.log("AddBatch", batch_id, exec_at, JSON.stringify(this.batch_schedule.filter(el => el != null)))
  }

  addTask(task, exec_at) {
    task.id = nextID(this.tasks)
    this.tasks[task.id] = task

    let added = false
    for (let i=0;i<this.task_schedule.length;i++) {
      let el = this.task_schedule[i]

      if (el[0] < exec_at) continue
      if (el[0] == exec_at) {
        this.task_schedule[i][1].push(task.id)
        added = true
        break
      }
      if (el[0] > exec_at) {
        this.task_schedule.splice(i, 0, [exec_at, [task.id]])
        added = true
        break
      }
    }

    if (!added) {
      this.task_schedule.push( [exec_at, [task.id]] )
    }

    //console.log("AddTask", task.id, exec_at, JSON.stringify(this.task_schedule.filter(el => el != null)))
  }

  removeTask(id) {
    let task = this.tasks[id]
    this.tasks[id] = null

    if (task.parent_id < 0) return

    let live = false
    for (let other_id of this.batch_tasks[task.parent_id]) {
      if (this.tasks[other_id] != null) {
        live = true
        break
      }
    }

    if (!live) this.removeBatch(task.parent_id)
  }

  removeBatch(id) {
    let target = this.batches[id].target
    
    this.target_batches.set(
      target, 
      this.target_batches.get(target).filter(other_id => other_id != id)
    )

    // Remove batch from storage
    this.batches[id] = null
  }

  /**
   * 
   * @param {number} id 
   * @returns {boolean}
   */
  dispatchBatch(id) {
    const batch = this.batches[id]

    //if (!batch.reserve(memory)) {return false}

    this.running_batches.push(id)

    let ids = []
    for (let [timestamp, task] of batch.makeTasks()) {
      this.addTask(task, timestamp)
      ids.push(task.id)
    }
    this.batch_tasks[id] = ids
    
    return true
  }

  /** Do we have any batches planed for this target? */
  isBusy(target) {
    return this.target_batches.has(target) && this.target_batches.get(target).length > 0
  }

  static load() {
    let inst = super.load()

    let recast = (cls, obj) => {
      if(obj==null) return obj
      return Object.create(cls, Object.getOwnPropertyDescriptors(obj))
    }

    inst.batches = inst.batches.map(el => recast(Batch.prototype, el))
    inst.tasks = inst.tasks.map(el => recast(Task.prototype, el))

    return inst
  }
}