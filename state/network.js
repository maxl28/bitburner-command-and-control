import { StorageEntry } from 'core/storage-entry'
import { MIN_WORKER_RAM } from 'core/globals'
import { isNumeric } from 'core/util'

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
	 * @param {Map} chunks
	 */
	chunks = new Map()

	taken = new Map()

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

	reserveChunk(size, id) {
		// Sanitize input values
		let usedTotal = this.taken.has(id) ? Math.round(this.taken.get(id)*100)/100 : 0
		size = Math.round(size*100)/100

		if (usedTotal < size) {
			let freeTotal = 0,
				freeParts = [],
				loopCounter = 0
			while (
				usedTotal + freeTotal < size &&
				this.state.get('__free').length > 0 &&
				loopCounter < 100 // ToDo: remove this infinity-loop-break...
			) {
				loopCounter++

				let part = this.state.get('__free').pop()
				let remain = size - usedTotal - freeTotal

				if (part[1] < MIN_WORKER_RAM) continue

				if (part[1] >= remain) {
					this.state.get('__free').push([part[0], part[1] - remain])
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
}