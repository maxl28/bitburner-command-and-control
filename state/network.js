import { StorageEntry } from 'core/storage-entry'
import { MIN_WORKER_RAM } from 'core/globals'

export class Network extends StorageEntry {
	static storageKey = 'State.Network'
	static storageValue = Network

	totalRAM = 0
	privateRAM = 0
	nodes = []
	contracts = []

	/**
	 * List of RAM chunks by process by host, has two entries by default,
	 * namely __free [Host, FreeRAM] and __taken [JobID, UsedRAM, Host].
	 * 
	 * @param {_state} Map
	 */
	state = new Map([
		['__free', []], // [Host, FreeRAM]
		['__taken', []] // [JobID, UsedRAM, Host]
	])
	/**
	 * Lookahead cache for future ram consumption requests.
	 * 
	 * atTime, wID, demandSize, memSpace
	 * 
	 * @param {_lookAhead} Array<[4]int> 
	 */
	_lookAhead = []

	/**
	 * Valid target hosts, eg. money > 0.
	 * 
	 * @param {_targets} Map
	 */
	targets = new Map()

	/**
	 * @param {_plan} Map
	 */
	plan = new Map()

	/**
	 * Keep track of max chunk sizes
	 *
	 * @param {chunks} Map
	 */
	chunks = new Map()

	/**
	 * List of all taken chunks, ordered by task ids
	 *  
	 * @param {_taken} Map
	 */
	taken = new Map()
	free = []
	allocations = new Map()
	spaces = new Map()
	daemons = new Map()

	constructor() {
		super()
	}

	/**
	 * Split one chunk of resources into smaller devisions.
	 *
	 * @param {[]} chunk List of Host, RAM pairs
	 * @param {[]} distribution Desired output distribution in percentages, eg. [.1,.3,.5,.1]
	 * @returns
	 */
	static splitChunk(chunk, distribution = [0.5, 0.5]) {
		// Calculate total RAM of chunk
		let total = 0
		for (let [host, ram] of chunk) {
			total += ram
		}

		// Replace percentages with actuall RAM values
		distribution = distribution.map((val) => {
			return Math.floor(val * total)
		})

		// Construct requested split
		let resultChunks = []
		for (let i = 0; i < distribution.length; i++) {
			resultChunks[i] = []

			// Fill sub-chunk until full or OOR
			let filled = 0
			while (filled < distribution[i]) {
				const part = chunk.pop()
				const remain = distribution[i] - filled

				// No more chunks, force exit
				if (part === undefined) break

				if (part[1] > remain) {
					resultChunks[i].push([part[0], remain])
					chunk.push([part[0], part[1] - remain])
					filled += remain
				} else {
					resultChunks[i].push(part)
					filled += part[1]
				}
			}
		}

		return resultChunks
	}

	nextFreeChunk(size, memSpace, wID, minFrag = MIN_WORKER_RAM) {
		if (!this.allocations.has(memSpace)) this.allocations.set(memSpace, [wID]);
		else this.allocations.get(memSpace).push(wID);

		const totalSpaceRAM = this.spaces.has(memSpace) ? this.spaces.get(memSpace) : 0

		// Sanitize input values
		let usedTotal = this.taken.has(wID) ? Math.round(this.taken.get(wID)*100)/100 : 0
		size = Math.min(totalSpaceRAM, Math.round(size*100)/100)

		if (usedTotal < size) {
			let freeTotal = 0,
				freeParts = [],
				loopCounter = 0
			while (
				usedTotal + freeTotal < size &&
				this.free.length > 0 &&
				loopCounter < 100 // ToDo: remove this infinity-loop-break...
			) {
				loopCounter++

				let part = this.free.pop()
				let remain = size - usedTotal - freeTotal

				if (part[1] < MIN_WORKER_RAM) continue

				if (part[1] >= remain) {
					this.free.push([part[0], part[1] - remain])
					freeTotal += remain
					freeParts.push([part[0], remain])
				} else {
					freeTotal += part[1]
					freeParts.push(part)
				}
			}

			return freeParts
		}

		return []
	}

	freeRAM() {
		let total = 0
		for (let [host, ram] of this.free) {
			total += ram
		}
		return total
	}

	register(wID, memSpace, host, cost) {
		this.state.get('__taken').push([wID, cost, host, memSpace])
		if (!this.taken.has(wID)) this.taken.set(wID, 0)
		this.taken.set(wID, this.taken.get(wID) + cost)

		this.space(memSpace, cost)
		this.allocations.get(memSpace).push(wID)
	}

	space(name, ram, shrink = false) {
		let prev = this.spaces.has(name) ? this.spaces.get(name) : 0

		if ( (prev > ram && shrink) || prev < ram) {
			this.spaces.set(name, ram)
		}
	}

	/**
	 * 
	 * @param {string} memSpace Any allocated space identifier, see space().
	 * @param {string} wID Any valid task identifier, see tryDispatch()@core/run.js.
	 * @param {number} size Whole number of RAM to allocate in GB.
	 * @param {number} atTime UNIX timestamp in millis .
	 * @returns {boolean}
	 */
	reserveChunkAt(ns, memSpace, wID, size, atTime = Date.now(), toTime = Date.now()) {
		//ns.tprint(`NET reserve ${memSpace} > ${size}GB for ${wID} range ${atTime} - ${toTime}`)

		let demandSize = Math.ceil(0+size)
		if (demandSize <= 0) {
			//ns.tprint(`Err: demand zero`)
			return false
		}

		if (atTime < (Date.now()-5) || toTime <= atTime) {
			//ns.tprint(`Err: invalid time range`)
			return false
		}

		const totalSpaceRAM = this.spaces.has(memSpace) ? this.spaces.get(memSpace) : 0
		if (totalSpaceRAM <= 0) {
			//ns.tprint(`Err: space '${memSpace}' has insufficient RAM: ${totalSpaceRAM}`)
			return false
		}

		const [dMap, takenRAM] = this.runningMemory(memSpace)
		const [dMapF, futureTotal] = this.lookUntil(memSpace, atTime)

		const alreadyReserved = (dMap.has(wID) ? dMap.get(wID) : 0) + (dMapF.has(wID) ? dMapF.get(wID) : 0)

		const demand = size - alreadyReserved
		if (demand <= 0) {
			//ns.tprint(`Err: already satisfied`)
		}

		if ( (totalSpaceRAM - Math.max(takenRAM, futureTotal)) < demand ) {
			//ns.tprint(`Err: no resources available`)
			return false
		}

		return this._reserve(atTime, toTime, wID, demandSize, memSpace)
	}

	freeChunksFor(wID) {
		this._lookAhead = this._lookAhead.filter(el => el[2] != wID)
	}

	_runningMemory = new Map()
	runningMemory(memSpace) {
		// Query cache
		if (this._runningMemory.has(memSpace) && this._runningMemory.get(memSpace)[0] > (Date.now() - 300)) return this._runningMemory.get(memSpace)[1]
		
		let distribution = new Map(), total = 0
		for (let [wID, cost, host, space] of this.state.get('__taken')) {
			if (space != memSpace) continue;

			total += cost
			
			let byId = distribution.has(wID) ? distribution.get(wID) : 0
			distribution.set(wID, byId + cost)
		}

		// Cache result and return
		this._runningMemory.set(memSpace, [Date.now(), [distribution, total]])
		return [distribution, total]
	}

	/**
	 * Fetch memory reservations relevant at a given time.
	 */
	lookUntil(memSpace, atTime) {
		let distribution = new Map(), total = 0, index = 0, deleteUntil = -1
		for (let [start, end, wID, cost, space] of this._lookAhead) {
			if (start > atTime) break;

			// Keep track of and remove old entries.
			if (start < Date.now()) deleteUntil = index;
			index++

			if (space != memSpace || end < atTime) continue;

			total += cost
			
			let byId = distribution.has(wID) ? distribution.get(wID) : 0
			distribution.set(wID, byId + cost)
		}

		if (deleteUntil > -1) {
			this._lookAhead = this._lookAhead.splice(0, deleteUntil+1)
		}

		return [distribution, total]
	}

	_reserve(atTime, toTime, wID, demandSize, memSpace) {
		let newEntry = [atTime, toTime, wID, demandSize, memSpace]

		let index = 0
		for (let entry of this._lookAhead) {
			if (entry[0] > atTime) break;
			else index++
		}
		this._lookAhead.splice(index, 0, newEntry)

		return true
	}

	reset() {
		this.totalRAM = 0
		this.privateRAM = 0
		this.nodes = []
		this.contracts = []
		this.state = new Map([
			['__free', []], // [Host, FreeRAM]
			['__taken', []] // [JobID, UsedRAM, Host]
		])
		this.targets = new Map()
		this.plan = new Map()
		this.taken = new Map()
		this.free = []
		this.allocations = new Map()
	}
}