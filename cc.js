import { asyncRun } from 'core/run'
import { Performance } from 'core/performance'
import { CC, Network, HostMap, Fragments, Tracker, Plan } from 'state/index'
import { CC_CYCLE_PAUSE, CC_BIG_TICK_COUNT, WORKER_SCRIPTS, DEBUG_TICK } from 'core/globals'

let perf = new Performance()
let cc = new CC()
let plan
let network
let hostMap
let fragments
let tracker

/** @param {NS} ns **/
export async function main(ns) {

	// HOTFIX: for bug in the game's dynamic RAM calculation.
	ns.exec('', ns.getHostname())

	DEBUG_TICK && perf.mark('Startup')

	DEBUG_TICK && perf.mark('Parse CLI')
	cc.host = ns.getHostname()
	cc.parseFlags(ns)
	cc.updateRamBuffer(ns)
	CC.save(cc)
	DEBUG_TICK && perf.done('Parse CLI')

	DEBUG_TICK && perf.mark('State Vars')
	// Fetch _current_ state
	network = Network.load()
	hostMap = HostMap.load()
	fragments = Fragments.load()
	plan = Plan.load()
	DEBUG_TICK && perf.done('State Vars')

	DEBUG_TICK && perf.mark('Initial Tick')
	await stateTick(ns, -1)
	DEBUG_TICK && perf.done('Initial Tick')

	//cc.updateNodestep(ns, hostMap)
	cc.notifyUpstart(ns, hostMap)

	DEBUG_TICK && perf.done('Startup')
	DEBUG_TICK && ns.tprint(perf.fetch())

	let tick = 0
	do {
		perf = new Performance()

			// Shall we shut down the whole network?
			if ( cc.flags.get('KillAll') ) {
				perf.mark('Shutdown')
				for (let node of network.nodes ) {
					for ( let script of WORKER_SCRIPTS ) {
						ns.scriptKill(script, node)
					}
				}
				perf.done('Shutdown')
				ns.tprint(perf.fetch())
				
				cc.flags.set('KillAll', false)
				CC.save(cc)
			}

		DEBUG_TICK && perf.mark('stateTick')
		await stateTick(ns, tick)
		DEBUG_TICK && perf.done('stateTick')

		// Plan shallow RAM distribution
		let res = {
			_total: network.totalRAM,
			Harvester: 1
		}
		if (cc.flags.get('Charge') > 0) {
			res['Charge'] = cc.flags.get('Charge')
			res['Harvester'] -= cc.flags.get('Charge')
		}
		if (cc.flags.get('Share') > 0) {
			res['Share'] = cc.flags.get('Share')
			res['Harvester'] -= cc.flags.get('Share')
		}

		DEBUG_TICK && perf.mark('Plan.tick')
		plan.network.tick(ns, network, res)
		DEBUG_TICK && perf.done('Plan.tick')

		// Increment loop counter
		tick++

		DEBUG_TICK && perf.mark('sleep')
		// Keep program from crashing
		await ns.sleep(CC_CYCLE_PAUSE)
		DEBUG_TICK && perf.done('sleep')

		// Print debug info
		if (DEBUG_TICK) {
			ns.tprint(`Tick[${tick}]: \n${perf.fetch()}`)
		}
	} while (!cc.flags.get('RunOnce') && !cc.flags.get('KillAll'))

	// Print exit notification
	cc.notifyShutdown(ns)
	ns.tprint('Done.')

	ns.exit()
}

async function stateTick(ns, tick = 0) {
	const dbgUp = tick < 0 || DEBUG_TICK

	// Push current vars to global state
	dbgUp && perf.mark('stateTick.save')
	Network.save(network)
	HostMap.save(hostMap)
	plan.save()
	dbgUp && perf.done('stateTick.save')

	dbgUp && perf.mark('stateTick.markTracker')
	// Is this our initial tick?
	if (tick < 0) {
		// Register new CC instance in tracker
		tracker = Tracker.load()
		tracker.ccChanges.push([Date.now(), cc.flags])
		Tracker.save(tracker)
	}
	dbgUp && perf.done('stateTick.markTracker')

	dbgUp && perf.mark('stateTick.CCupdate')
	// Gather sourceFile lvls
	await asyncRun(ns, 'task/update_player.js')

	// Execute queried opperations
	await asyncRun(ns, 'task/server_delete.js')
	await asyncRun(ns, 'task/server_add.js')

	// Reload CC
	cc = CC.load()
	dbgUp && perf.done('stateTick.CCupdate')

	dbgUp && perf.mark('stateTick.scan')
	// See if our network has expanded
	await asyncRun(ns, 'task/scan.js')
	await asyncRun(ns, 'task/scan_analyze.js')
	dbgUp && perf.done('stateTick.scan')

	// SourceFile-1 Stanek's Gift
	if (cc.sourceFileLvl(1) > 0) await asyncRun(ns, 'task/update_fragments.js')

	// SourceFile-7 Bladeburners 2079
	if (cc.sourceFileLvl(7) > 0) await asyncRun(ns, 'task/update_bladeburner.js')

	dbgUp && perf.mark('stateTick.PlanUpdate')
	// Formulate strategy for current state
	await asyncRun(ns, 'task/update_plan.js')
	dbgUp && perf.done('stateTick.PlanUpdate')

	dbgUp && perf.mark('stateTick.deploy')
	// Push latest worker scripts to all compute nodes
	await asyncRun(ns, 'task/deploy.js')
	dbgUp && perf.done('stateTick.deploy')

	// Do utility actions like contracts every now and again
	if (tick % CC_BIG_TICK_COUNT == 0) {
		await asyncRun(ns, 'task/util.js')
	}

	dbgUp && perf.mark('stateTick.load')
	// Refresh intel
	network = Network.load()
	hostMap = HostMap.load()
	fragments = Fragments.load()
	plan = Plan.load()
	dbgUp && perf.done('stateTick.load')
}