import { tryDispatch } from 'core/run'
import { splitMemory } from 'core/util'
import { MIN_WORKER_RAM } from 'core/globals'

export class Pipeline {
	UID = 'PIP_' + Math.ceil(Date.now() * Math.random())

	pipeType

	tasks = {
		total: 0,
		/**
		 * @param {int} current tasks.list index pointer
		 */
		index: 0,
		repeat: false,

		/**
		 * @param {Task[]} list
		 */
		list: [],
	}

	get isDone() {

		for ( let entry of this.tasks.list ) {

			if ( !entry.isDone ) return false
		}

		return true
	}
	set isDone(val) {}

	constructor(type = 'Async', data = [], title = '', repeat = false) {
		this.UID = Math.floor(Math.random() * Date.now())
		this.title = title == '' ? 'Pipeline ' + this.UID : title

		this.pipeType = type

		this.tasks = {
			total: data.length,
			index: 0,
			list: data,
			repeat: repeat
		}
	}

	tick(ns, resources, totalRAM) {
		if (this.isDone && this.tasks.repeat) this.reset()

		this.cleanup(resources)

		if (!this.isDone) this[`run${this.pipeType}`](ns, resources, totalRAM)
	}

	runAsync(ns, resources, totalRAM) {
		// Handle memory allocation
		let chunks = splitMemory(totalRAM, this)

		for (let child of this.tasks.list) {
			child.tick(ns, resources, chunks.data[child.UID])
		}
	}

	runSync(ns, resources, totalRAM) {
		let entry = this.next()

		// Remove already occupied RAM from calculation
		totalRAM -= this.deployedLocalRAM(resources)

		entry.tick(ns, resources, totalRAM)
	}

	cleanup(resources) {
		for (let entry of this.tasks.list) {
			if (entry.isDead(resources)) this.removeByUID(entry.UID)
		}
	}

	/** @returns Task|false */
	next() {
		let i = this.tasks.index

		if (this.tasks.list.length > i) {
			if (this.tasks.list[i].isDone) {
				this.tasks.index++
				return this.next()
			}

			return this.tasks.list[i]
		}

		return false
	}

	cur() {
		return this.tasks.list.length > this.tasks.index
			? this.tasks.list[this.tasks.index]
			: false
	}

	has(key) {
		for (let task of this.tasks.list) {
			if (task.title == key) return true
		}

		return false
	}

	/**
	 * Append taks to the end of the list
	 * @param {Pipeline|Task} obj
	 */
	appendEntry(obj) {
		if (obj instanceof Pipeline && this.has(obj.title)) obj.title += '_1'

		this.tasks.total++
		this.tasks.list.push(obj)
		this.isDone = false
	}

	/**
	 *
	 * @param {String} key
	 * @returns Task | Pipeline | null
	 */
	get(key) {
		for (let task of this.tasks.list) {
			if (task.title == key) return task
		}

		return null
	}

	delete(key) {
		return this.removeByUID(this.get(key).UID)
	}

	remaining() {
		let remaining = 0

		for ( let entry of this.tasks.list ) {

			if ( !entry.isDone ) remaining++
		}

		return remaining
	}

	reset() {
		for ( let entry of this.tasks.list ) {
			if ( entry.isDone ) entry.reset()
		}
	}

	isDead(resources) {
		// Search network for any running workers with taskIDs from this pipeline's tasks
		for (let id of this.taskIDs()) {
			if (resources.taken.has(id) && resources.taken.get(id) > 0) return false
		}

		return this.isDone
	}

	taskIDs() {
		let ids = []
		for (let entry of this.tasks.list) {
			if (entry instanceof Task) ids.push(entry.UID)
			else ids = [...ids, ...entry.taskIDs()]
		}

		return ids
	}

	deployedLocalRAM(resources) {
		let deployedRAM = 0
		for (let entry of this.tasks.list) {
			if (entry instanceof Task) {
				if (!entry.isDone) continue

				deployedRAM += resources.taken.has(entry.UID)
					? resources.taken.get(entry.UID)
					: 0
			} else {
				deployedRAM += entry.deployedLocalRAM(resources)
			}
		}

		return deployedRAM
	}

	removeByUID(uid) {
		for (let i = 0; i < this.tasks.list.length; i++) {
			if (this.tasks.list[i].UID == uid) {
				this.spliceEntry(i, 1)
				break
			}
		}
	}

	spliceEntry(start, deleteCount) {
		// Does this change affects the array pointer?
		if (start < this.tasks.index && start + deleteCount >= this.tasks.index) {
			// Move pointer to start of new block
			this.tasks.index = start
		}
		if (start + deleteCount <= this.tasks.index) {
			this.tasks.index -= deleteCount
		}

		// Remove range from task list
		this.tasks.list.splice(start, deleteCount)
		this.tasks.total = this.tasks.list.length
	}

	static parse(pip) {
		pip.tasks.list = pip.tasks.list.map((entry) => {
			if (entry.hasOwnProperty('pipeType')) {
				let cPip = Object.assign(new Pipeline(), entry)
				cPip = Pipeline.parse(cPip)

				return cPip
			} else {
				return Object.assign(new Task(), entry)
			}
		})

		return pip
	}
}

export class Task {
	UID = 'JID_' + Math.ceil(Date.now() * Math.random())

	get isDone() { return this.doneThreads >= this.threads }
	set isDone(val) {}

	doneThreads = 0
	title = 'Task'

	constructor(script, ramCost, threads, args) {
		this.script = script
		this.baseRAMCost = ramCost
		this.threads = threads
		this.args = args
	}

	tick(ns, resources, totalRAM) {
		let numSuccess = 0
		if (totalRAM > MIN_WORKER_RAM) {
			let chunk = resources.reserveChunk(totalRAM, this.UID)

			numSuccess = tryDispatch(
				ns,
				chunk,
				[this.script, this.baseRAMCost],
				this.threads - this.doneThreads,
				...this.args,
				this.UID
			)
		}

		this.doneThreads += numSuccess

		return this.isDone
	}

	isDead(resources) {
		return (
			this.isDone &&
			(resources.taken.has(this.UID)
				? resources.taken.get(this.UID) == 0
				: true)
		)
	}

	reset() {
		this.doneThreads = 0
	}
}
