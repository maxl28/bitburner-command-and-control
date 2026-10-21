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

	tick(ns, memory, totalRAM) {
		if (this.isDone && this.tasks.repeat) this.reset()

		this.cleanup(memory)

		if (!this.isDone) this[`run${this.pipeType}`](ns, memory, totalRAM)
	}

	runAsync(ns, memory, totalRAM) {
		// Handle memory allocation
		let chunks = splitMemory(totalRAM, this)

		for (let child of this.tasks.list) {
			child.tick(ns, memory, chunks.data[child.UID])
		}
	}

	runSync(ns, memory, totalRAM) {
		let entry = this.next()

		// Remove already occupied RAM from calculation
		totalRAM -= this.deployedLocalRAM(memory)

		if (totalRAM > 0) {
			entry.tick(ns, memory, totalRAM)
		}
	}

	cleanup(memory) {
		for (let entry of this.tasks.list) {
			if (entry.isDead(memory)) this.removeByUID(entry.UID)
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

	isDead(memory) {
		// Search network for any running workers with taskIDs from this pipeline's tasks
		for (let id of this.taskIDs()) {
			if (memory._fetch('wID', id, true) > 0) return false
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

	curRAMDemand() {
		const demand = e => e instanceof Task ? e.baseRAMCost * e.threads : e.curRAMDemand();

		if (this.type == 'Sync' && this.cur() !== false) {
			return demand(this.cur())
		}

		return this.tasks.list.slice(Math.max(0, this.tasks.index-1)).reduce((cb, e) => cb+demand(e), 0)
	}

	deployedLocalRAM(memory) {
		let deployedRAM = 0
		for (let entry of this.tasks.list) {
			if (entry instanceof Task) {
				if (!entry.isDone) continue

				deployedRAM += memory._fetch('wID', entry.UID, true)
			} else {
				deployedRAM += entry.deployedLocalRAM(memory)
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

	constructor(script, ramCost, memSpace = 'harvest', threads = 1, args = []) {
		this.script = script
		this.baseRAMCost = ramCost
		this.memSpace = memSpace
		this.threads = threads
		this.args = args
	}

	/**
	 * @param {ns} NS 
	 */
	tick(ns, memory, totalRAM) {
		let numSuccess = 0
		if (totalRAM > MIN_WORKER_RAM) {
			let chunk = memory.next(this.UID, this.memSpace, Math.min(totalRAM, this.threads*this.baseRAMCost))

			numSuccess = tryDispatch(
				ns,
				chunk,
				[this.script, this.baseRAMCost],
				this.threads - this.doneThreads,
				...this.args,
				this.memSpace,
				this.UID
			)
		}

		this.doneThreads += numSuccess

		return this.isDone
	}

	isDead(memory) {
		return (
			this.isDone &&
			(memory._fetch('wID', this.UID) == null
				? true
				: memory._fetch('wID', this.UID) == 0)
		)
	}

	reset() {
		this.doneThreads = 0
	}
}
