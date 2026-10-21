import { tryDispatch } from 'core/run'
import { MEM_SPACE_DEFAULT, SCRIPT_COSTS, FARM_DESIRED_VOLUME, FARM_MIN_VOLUME, FARM_BATCH_STAGGER, MIN_WORKER_RAM, FARM_MAX_VOLUME } from 'core/globals'

const growTimeMultiplier = 3.2,
      weakenTimeMultiplier = 4

export class Batch {

  target = 'n00dles'
  _data = []

  id = -1

  /**
   * REMINDER: You need to set the id manually
   * @param {NS} ns 
   * @param {string} target 
   * @param {[]} taskData 
   */
  constructor(ns, target, taskData = []) {
    this.target = target
    this._data = taskData
  }

  runtime() {
    let tMin = Date.now()+99999, tMax = 0
    for (let [start, duration, cmd, space, threads, args] of this._data) {
      if (start < tMin) tMin = start
      if ((start+duration) > tMax) tMax = start+duration
    }

    return [tMin, tMax]
  }

  consumption() {
    return this._data.reduce((ag, [start, duration, cmd, space, threads, args]) => ag+threads*MIN_WORKER_RAM, 0)
  }

  get space() {
    return this._data.length > 0 ? this._data[0][3] : 'n/a'
  }
  
  static makeData(ns, target, targetVolume = FARM_DESIRED_VOLUME, repeat = 1) {    
    if (target == null || !target['moneyAvailable']) {
      ns.tprint('ERROR: Can\'t resolve target: ', target.hostname, ': ', typeof target, JSON.stringify(target))
      return false
    }

    let hackAmount = target.moneyMax * targetVolume
    if (hackAmount > target.moneyAvailable) {
      if ((target.moneyMax / target.moneyAvailable) >= FARM_MIN_VOLUME)  {
        targetVolume = Math.round((target.moneyAvailable / target.moneyMax) * 100) / 100
        //ns.tprint('WARN: Target liquidity too low, adjusting volume to ', target.hostname, ' -> ', targetVolume*100, '%')
      } else {
        //ns.tprint('ERROR: Batch.calc() for unprimed target: ', target.hostname)
        return false
      }
    }

    let raw = balance(ns, target, targetVolume).sort((a,b) => (a[0]+a[1])-(b[0]+b[1])), result = [...raw]
    for (let i=0;i<repeat;i++) {
      raw = raw.map(val => {val[0]+=(1+i)*FARM_BATCH_STAGGER; return val})
      result.push(...raw)
    }

    return result
  }

  static volume(ns, srv, threadCap) {
    let tThreads = (a,b,c) => Batch.threadsFor(a,b,c).reduce((ag,el) => ag+el)

    let volume = 1
    while (volume > 0 && tThreads(ns, srv, volume) > threadCap) {
      volume -= .05
    }

    return volume
  }

  static prime(ns, srv, ram, targetPercent = FARM_MAX_VOLUME) {
    if (srv == null || !srv['moneyAvailable']) {
      ns.tprint('ERROR: Can\'t resolve target: ', srv.hostname, ': ', typeof srv, JSON.stringify(srv))
      return false
    }

    const dVolume = srv.moneyMax*targetPercent - srv.moneyAvailable
    if (dVolume < 1) {
      ns.tprint('ERROR: Invalid target liquidity: ', srv.hostname, ': ', srv.moneyAvailable)
      return false
    }

    const growThreads   = Math.ceil(ns.growthAnalyze(srv.hostname, dVolume / srv.moneyAvailable))
    const growSecInc    = ns.growthAnalyzeSecurity(growThreads, srv.hostname)
    const weakenThreads = Math.ceil(growSecInc / 0.05)

    let dNow = Date.now(), space='harvest', args = [srv.hostname]
    const tWeaken = dNow
    const tGrow   = Math.ceil(dNow+4*srv.hackTime - 3.2*srv.hackTime)+FARM_BATCH_STAGGER

    let data = [], cost = weakenThreads+growThreads*MIN_WORKER_RAM, parts = Math.max(1, Math.ceil(cost / ram))
    
    for (let i = 0; i < parts; i++) {
      let offset = i*(4*srv.hackTime+FARM_BATCH_STAGGER)
      data.push(...[
        [tWeaken+offset, Math.ceil(4*srv.hackTime), 'weaken', space, weakenThreads, args],
        [tGrow+offset, Math.ceil(3.2*srv.hackTime), 'grow', space, growThreads, args]
      ])
    }

    return data
  }

  static threadsFor(ns, srv, volume = FARM_DESIRED_VOLUME) {
    const tHack     = Math.max(1, Math.ceil(volume / srv.percentPerHack))
    const tWeaken1  = Math.ceil( Math.max(1, tHack / 4) )
    const tGrowth   = Math.ceil(ns.growthAnalyze(srv.hostname, srv.moneyMax * volume))
    const tWeaken2  = Math.ceil( ns.growthAnalyzeSecurity(tGrowth) / .002 )

    return [tHack, tWeaken1, tGrowth, tWeaken2]
  }

  static consumption(ns, srv,ramCap) {
		return Math.round(Batch.threadsFor(ns, srv).reduce((ag,v)=>ag+v,0)*MIN_WORKER_RAM*(Batch.duration(ns,srv,ramCap)/(FARM_BATCH_STAGGER*5)))
  }

  static duration(ns, srv, ramCap) {
    let tasks = Batch.calc(ns, srv, FARM_DESIRED_VOLUME, ramCap/MIN_WORKER_RAM, 0)
    if (tasks.length < 1) return 0

    let b1 = new Batch(ns, srv.hostname, tasks)
    let [bStart, bEnd] = b1.runtime()
    return bEnd-bStart
  }

  /**
   * 
   * @return [][number, Task] | null
   */
  makeTasks() {
    if (this.id < 0) return;

    let tasks = [], cntr = 0,
        byStartAsc = this._data .sort((a,b) => a[0] - b[0])
    for( let [start, duration, cmd, space, threads, args] of byStartAsc ) {
      tasks.push([
        start,
        new Task(this.id, cntr, space, `worker/${cmd}.js`, threads, args)
      ])

      cntr++
    }

    return tasks
  }

  dispatch(ns, memory) {
    if (this._data.length < 1) {
      ns.tprint('Batch.dispatch() without data...')
    }
    
    // Try and reserve memory on the network
    let success = [], totalCost = 0
    for ( let entry of this._data ) {            
      if (memory.schedule(ns, ...entry)) {
        success.push(`${this.target}_${entry[0]}`)
        totalCost += (SCRIPT_COSTS[`/worker/${entry[2]}.js`] * entry[4])
      } else {
        success.forEach(el => memory.free(el))
        return -1
      }
    }
  
    ns.tprint(`INFO: batch ${this._uid}_${this.target} - ${success.length} tasks for ${totalCost} GB`)
  
    return totalCost
  }
}

/**
 * 
 * @param {NS} ns
 * @param {Server} target Stored server object
 * @param {number} volume percent of total money to fetch, between 0 and 1
 * @returns {Array} List of [T, 'hack/grow/weaken', threads, args]
 */
function balance(ns, target, volume) {
  let space = 'harvest'

  let [tHack, tWeaken1, tGrowth, tWeaken2] = Batch.threadsFor(ns, target, volume)

  let relTime   = Math.max(target.weakenTime, target.growTime, target.hackTime)+3*FARM_BATCH_STAGGER
  const dHack   = Math.max(0,  Math.ceil(relTime - target.hackTime - 3*FARM_BATCH_STAGGER)),
        dGrow   = Math.max(0, Math.ceil(relTime - target.growTime - FARM_BATCH_STAGGER)),
        dWeakA  = Math.max(0, Math.ceil(relTime - target.weakenTime + FARM_BATCH_STAGGER)),
        dWeakB  = dWeakA+2*FARM_BATCH_STAGGER

  // ToDo: implement balancing
  //if (totalThreads < (tHack/tHackStep + tWeaken1 + tGrowth)) {}

  // Todo: Fix staggering. They dont need to end all at the same time but idealy in hack, weak1, grow, weak2
  let args = [target.hostname], now = Date.now()
  let taskData = [
    [now+dHack, Math.ceil(target.hackTime), 'hack', space, tHack, args],
    [now+dWeakA, Math.ceil(target.weakenTime), 'weaken', space, tWeaken1, args],
    [now+dGrow, Math.ceil(target.growTime), 'grow', space, tGrowth, args],
    [now+dWeakB, Math.ceil(target.weakenTime), 'weaken', space, tWeaken2, args]
  ]
  
  return taskData.sort((a,b) => a[0] > b[0] ? 1 : -1)
}

export class Task {
  /**
   * Who does this belong to? usually `type_uid`
   * e.g. `batch_4`
   */
  parent_id = null
  /**
   * Own id relative to parent
   */
  id = -1
  /**
   * What Memory.space do we run in?
   */
  execution_space = MEM_SPACE_DEFAULT
  /**
   * example: worker/hack.js
   */
  script = null

  /**
   * Any arguments to pass to the script. This class
   * will automatically add proc_ident as the penultimate
   * and a random number as last argument.
   */
  script_args = []
  /**
   * How many threads to run?
   */
  threads = 1
  /**
   * How many threads have been dispatched already?
   */
  dispatched_threads = 0

  get cost() {
    return Math.round( (SCRIPT_COSTS[this.script] || 0) * this.threads * 100 ) / 100 
  }

  get proc_ident() {
    return `${this.execution_space}_${this.parent_id}_${this.id}`
  }

  get args() { return [] }

  get isDone() { return (this.threads - this.dispatched_threads) <= 0 }

  isDead(memory) {
    return this.isDone && memory._fetchProcRelation('proc_ident', this.proc_ident, true) <= 0 
  }

  constructor(parent_id, id, space, script, threads, args) {
    this.parent_id = parent_id
    this.id = id
    this.execution_space = space 
    this.script = script[0] == '/' ? script : `/${script}`
    this.script_args = args
    this.threads = threads

    //console.log("TASK: ", this.proc_ident, " ", this.script, " ", JSON.stringify(this.script_args))
  }

  tick(ns, memory) {
    let d = this.dispatched_threads, chunks = memory.next(this.execution_space, this.proc_ident, this.cost)
    this.dispatched_threads += tryDispatch(
      ns,
      chunks,
      [this.script, SCRIPT_COSTS[this.script]],
      this.threads - this.dispatched_threads,
      ...this.script_args,
      this.proc_ident
    )

    /*
    d = this.dispatched_threads - d
    if (d < 1) {
      ns.tprint("WARN: Task.tick() failed to dispatch ", this.proc_ident, " (", this.dispatched_threads, "/", this.threads, ")")
      ns.tprint(" >> available mem: ", JSON.stringify(chunks))
    }
    */
    
    return this.isDone
  }
}