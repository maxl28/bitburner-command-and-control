// @ts-nocheck
import { StorageEntry } from 'core/storage-entry'
import { ucFirst } from 'core/util'
import { SCRIPT_COSTS, SCHEDULE_BUFFER_SIZE, MIN_WORKER_RAM, MEM_SPACE_DICT} from 'core/globals'

/**
 * Holds information about the current state of the network, 
 * including available RAM, allocations, and running processes.
 * 
 * Essentially, this class is a representation of the "actual" 
 * and "should-be" state of the network's memory resources.
 * Allowing us to easily query real world data about processes
 * and RAM allocations, as well as to plan and allocate the next cycle.
 */
export class Memory extends StorageEntry {

  static storageKey = 'State.Memory'
	static storageValue = Memory

  totalRAM = 0
  privateRAM = 0

  /**
   * host -> totalRam
   * This shows us a total of available RAM on the network.
   */
  contingent = new Map()
  /**
   * List of host -> [][space,size]
   */
  allocations = new Map()
  /**
   * Overview of cmd -> RAM
   */
  commands = new Map()

  /**
   * Reference of ram distribution: ident -> percentage
   */
  spaces = new Map()

  /**
   * association between space and free chunks, see allocateSpaces()
   */
  space_chunks = new Map()

  scheduleBuffer = new Array(SCHEDULE_BUFFER_SIZE)
  _scheduleT = new Map()

  /**
   * List of all currently running scripts
   * @see task/update_network.js
   */
  _processes = []

  _bySpace = new Map()
  _byProcIdent = new Map()
  _byHost = new Map()

  
  constructor() { super() }

//////////// MUTATE START

  /**
   * Mutate 'Actual-State'
   * 
   * What do we have as compute resources?
   * 
   * @param {string} host 
   * @param {number} ram 
   * @param {boolean} isCloud 
   */
  registerContingent(host, ram, isCloud = false) {
    this.contingent.set(host, ram)
    this.totalRAM += ram
    if (isCloud) this.privateRAM += ram
  }

  /**
   * Mutate 'Should-Be-State'
   * 
   * How do we devide our available memory?
   * 
   * @param {string} ident 
   * @param {number} percent 
   * @returns {boolean}
   */
  registerSpace(ident, percent) {
    if (percent < 0 || percent > 1) {
      if (this.spaces.has(ident)) return true

      const total   = Array.from(this.spaces.values()).reduce((ac, v) => ac+v, 0),
            reserve = 1 - total
      
      if (reserve <= 0) return false
      this.spaces.set(ident, reserve) 
    }

    this.spaces.set(ident, percent)
    return true
  }
  
  /**
   * Mutate 'Actual-State'
   * 
   * Register running process on a host, eg memory taken rn.
   * 
   * @param {*} host 
   * @param {*} proc 
   * @param {*} threads 
   */
  registerProcess(host, proc, threads) {
    // Extract cmd string
		var cmd = proc.filename.slice(7, -3)
		if (cmd != 'share') cmd += ' ' + proc.args[1]

		const cost  = threads * SCRIPT_COSTS[`/${proc.filename}`],
          proc_ident = proc.args[proc.args.length - 2],
          space = proc_ident.split('_')[0]
    
		// Add worker to state
    this.commands.set(
		  cmd,
			(this.commands.has(cmd) ? this.commands.get(cmd) : 0) + cost
		)

    const id = this._processes.length
    this._processes.push([proc_ident, space, host, cost])

    this._appendProcRelation('space', space, id, cost)
    this._appendProcRelation('proc_ident', proc_ident, id, cost)
    this._appendProcRelation('host', proc_ident, id, cost)

    this.registerAlloc(space,host,cost)
  }

  registerAlloc(space,host,cost) {
    let free = this.freeByHost(host)
    if (free <= MIN_WORKER_RAM) return 0;
    if (free < cost) cost = free

    let data = !this.allocations.has(host) ? [] : this.allocations.get(host)
    let prevI = -1
    for (let i=0;i<data.length;i++) { 
      if (data[i][0] == space) {
        prevI = i
        break;
      }
    }

    if (prevI > -1) data[prevI][1] += cost
    else data.push([host, cost])

    return cost
  }

  /**
   * Helper function for registerProcess().
   * Indexes attributes of process for easy lookup.
   * 
   * @param {string} reg
   * @param {string} ident reverse lookup ref
   * @param {number} procId index inside Memory._processes
   * @param {number} cost consumed RAM, eg script_cost*threads. 
   */
  _appendProcRelation(reg, ident, procId, cost) {
    reg = '_by'+reg.split('_').map(el => ucFirst(el)).join('')
    let old = this[reg].has(ident) ? this[reg].get(ident) : []
    let oldTotal = this[reg].has('__t'+ident) ? this[reg].get('__t'+ident) : 0
    this[reg].set(ident, [...old, procId])
    this[reg].set('__t'+ident, oldTotal+cost)
  }
  /**
   * 
   * @param {string} reg 
   * @param {any} ident 
   * @returns {array} hit or empty array.
   */
  _fetchProcRelation(reg, ident, total = false) {
    reg = '_by'+reg.split('_').map(el => ucFirst(el)).join('')
    if (!this[reg].has(ident)) return total ? 0 : []

    if (total) {
      return this[reg].get('__t'+ident)
    }
    return this[reg].get(ident).map(el => this._processes[el])
  }

  /**
   * Reset memory to inital state, called in task/update_network.js.
   */
  reset() {
    this.totalRAM   = 0
    this.privateRAM = 0

    this.commands = new Map()
    this.contingent = new Map()

    this.space_chunks = new Map()

    this._processes = []
    this._bySpace = new Map()
    this._byProcIdent = new Map()
    this._byHost = new Map()
  }

  /**
   * Counterpart to reset(), once all processes have been registered,
   * sort remaining chunks to spaces.
   */
  allocateSpaces() {
    console.log("Memory.allocateSpaces() called, allocating free chunks to spaces...")

    /**
     * Map out free resources and host - space relation
     */
    let free_chunks = [], host_spaces = new Map()
    for (let host of Array.from(this.contingent.keys())) {
      let free = this.freeByHost(host), total = this.contingent.get(host)
      
      if (free < MIN_WORKER_RAM) continue;
      if (free < total) {
        let occup_spaces = this._fetchProcRelation('host', host, true).map(
          proc => proc[2]
        )

        host_spaces.set(host, occup_spaces.filter(
          (el, i) => occup_spaces.indexOf(el) == i)
        )
      }

      //console.log(' > ', host, ': ', free, ' of ', total, ' GB')
      free_chunks.push([host, free])
    }
    

    /**
       * @returns {[Array, Array]}
       */
    let assign = function(chunks, assigned = [], cap, defrag = false) {
      console.log("---> assign() called, chunks: ", chunks.length, " cap: ", cap, " defrag: ", defrag)

      let total = 0, breaker = chunks.length * 1.5
      while (chunks.length > 0 && total < cap && breaker > 0) {
        let [host, ram] = chunks.shift()
        breaker--;

        // Exit condition for defragmentation, eg space has no running procs on this host.
        if ( 
          defrag && !(
            host_spaces.has(host) && 
            host_spaces.get(host).indexOf(space) > -1
          )
        ) {
          chunks.push([host, ram])
          continue;
        }

        let expand = Math.min(ram, cap), delta = ram - expand
        if (delta > 0) {
          chunks.push([host, delta])
        }

        //console.log(" -> assign ", host, " ", expand, " GB")
        assigned.push([host, expand])
        total += expand
      }

      return (defrag && total < cap) ? assign(chunks, assigned, cap-total) : [chunks, assigned]
    }

    for (let space of Array.from(this.spaces.keys())) {
      const total = this.spaceSize(space),
            usage = this._fetchProcRelation('space', space, true),
            spaceDelta = total - usage

      console.log(" -> space:",space, "( ", usage," / ", total, " )")

      // Are we fully booked already?
      if (spaceDelta <= 0) {
        this.space_chunks.set(space, [])
        continue;
      }

      
      let [remaining, allocations] = assign(
        free_chunks,
        [],
        spaceDelta,
        usage > 0)

      this.space_chunks.set(space, allocations)

      let ram = allocations.reduce((ag, el) => ag+el[1], 0)
      console.log(" -> space:",space," assigned ", ram, " GB of ", spaceDelta, " GB, remaining chunks: ", remaining.length)
    }
  }

  freeByHost(host) {
    let total = this.contingent.get(host)

    if (!this.allocations.has(host)) return total

    return total - this.allocations.get(host).reduce((ag, el) => ag+el[1])
  }

  freeBySpace(space) {
    return this.spaceSize(space) - this._fetchProcRelation('space', space, true)
  }

  /**
   * 
   * @param {string} space 
   * @param {string} proc_ident 
   * @param {number} size 
   * @returns {[][host, ram]}
   */
  next(space, proc_ident, size) {
    console.log("Memory.next() candidate ", proc_ident, ' requesting ', size, '/',this.spaceSize(space) ,' GB in ', space)
    let free_chunks = this.space_chunks.get(space)
    console.log('Memory.next() free_chunks ', JSON.stringify(free_chunks))
    
    if (size > this.freeBySpace(space)) {
      size = this.freeBySpace(space)
    }
    
    let assign = [], expand = size, breaker = (free_chunks.length+1)*1.7
    while (size > 0 && free_chunks.length > 0) {
      breaker--
      if (breaker <= 0) {
        console.log("Memory.next() breaker triggered, aborting...")
        break;
      }
      
      let [host, ram] = free_chunks.pop()
      
      expand = Math.min(size, ram)
      let overhang = expand % MIN_WORKER_RAM, expD = MIN_WORKER_RAM - overhang
      if ( overhang > 0 ) {
        if ( ram >= ( expand + expD ) ) {
          expand += expD
        } else if ( (expand - overhang) >= MIN_WORKER_RAM ) {
          expand -= overhang
        } else {
          continue;
        }
      }
      
      if (expand <= 0 && ram < MIN_WORKER_RAM) continue;
      expand = Math.round(expand * 100) / 100

      console.log(' --> ', host, ' has ', ram, ' GB free, requesting ', expand, ' of ', size, ' GB')

      let delta = Math.round((ram - expand) * 100) / 100
      if (expand < ram && delta >= MIN_WORKER_RAM) free_chunks.push([host, delta])
      
      
      assign.push([host, expand])
      size -= expand
    }

    this.space_chunks.set(space, free_chunks)

    console.log("Memory.next() assigned ", JSON.stringify(assign))
    return assign
  }

  spaceSize(ident) {
    if (!this.spaces.has(ident)) return 0

    return Math.floor(this.totalRAM * this.spaces.get(ident))
  }

  usage(type = 'space', ident) {
    return this._fetchProcRelation(type, ident, true)
  }
}