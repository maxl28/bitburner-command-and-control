import {
	MAX_SCRIPT_RUNTIME,
	DEBUG_RUN,
	DEBUG_DISPATCH
} from 'core/globals'

/**
	 * ns.run a script and wait for it to finish.
	 * 
	 * @param {NS} ns
	 * @param {String} script
	 * @param {Array} args 
	 *
	 * @returns Promise<boolean>
	 */
export async function asyncRun(ns, script, ...args) {

	// Log child script start time
	let tStart = Date.now()

	// Add a unique ID so we can execute the same script multiple times
	args.push(tStart)

	DEBUG_RUN && ns.tprint('AsyncRun: ', script)

	// Run script, note process ID
	const pid = ns.run(script, 1, ...args)

	// Check run error
	if (pid === 0) return false

	// Main logic
	let contains = false
	do {

		// Reset check
		contains = false

		// Check if script is still running
		for (let proc of ns.ps()) {

			// Is this our script?
			if (proc.pid == pid) {

				// Flag process running
				contains = true

				// ToDo: Add proper loop escape; right now, we'll always escape the top most loop...
			}
		}

		// Cooldown time, we don't wanna overdo these check loops^^
		await ns.sleep(5)
	} while (
		contains && // Await script completion
		Date.now() < tStart + MAX_SCRIPT_RUNTIME  // catch max runtime exceeded
	)

	return true
}

/** 
 * @param {NS} ns
 * @param {Array} chunk
 * @param {Array} script	Pair of [ScriptFileName, ScriptBaseRAMCost]
 */
export function tryDispatch(ns, chunk, script, threads, ...args) {

	if (chunk.length < 1) return 0

	// Is this a single [host, ram] or a real chunk?
	if (Array.isArray(chunk[0])) {
		
		// Spread out dispatch over child entries
		let runThreads = 0,
			part,
			dispatchCounter = 0
		while (chunk.length > 0 && dispatchCounter < 500) {

			part = chunk.pop()
			dispatchCounter++

			runThreads += tryDispatch(
				ns,
				part,
				script,
				threads - runThreads,
				...args
			)

			if (threads <= runThreads) break
		}

		if (dispatchCounter > 499) ns.tprint(`WARN: loop limit reached for ${script}`)

		return runThreads
	}

	// Check available ressources
	let ramUsage = 0+(script[1] * threads)
	const ramAvail = chunk[1]

	// Ensure we only try to take available RAM.
	if (ramUsage > ramAvail) {
		threads = Math.floor(ramAvail / script[1])
		ramUsage = 0+(script[1] * threads)
	}

	// No Dice, nothing to do.
	if (threads <= 0) return 0

	DEBUG_DISPATCH && ns.tprint(`TryDispatch: ${script[0]}	on ${chunk[0]} with ${threads} threads / ${ramUsage} RAM;`)

	// Try execute
	const pid = ns.exec(script[0], chunk[0], threads, chunk[0], ...args, Date.now())

	DEBUG_DISPATCH && ns.tprint(`${pid > 0 ? 'SUCCESS' : 'FAIL'}`)

	// Return number of successfully deployed threads.
	return pid > 0 ? threads : 0
}
