import { asyncRun } from 'core/run'
import { Performance } from 'core/performance'
import { CC, Network, HostMap, Fragments, Tracker, Plan } from 'state/index'
import { CC_CYCLE_PAUSE, CC_BIG_TICK_COUNT, WORKER_SCRIPTS } from 'core/globals'

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

	cc.flags.DebugTick && perf.mark('Startup')

	cc.flags.DebugTick && perf.mark('Parse CLI')
	cc.host = ns.getHostname()
	cc.parseFlags(ns)
	cc.updateRamBuffer(ns)
	CC.save(cc)
	cc.flags.DebugTick && perf.done('Parse CLI')

	cc.flags.DebugTick && perf.mark('State Vars')
	// Fetch _current_ state
	network = Network.load()
	hostMap = HostMap.load()
	fragments = Fragments.load()
	plan = Plan.load()
	cc.flags.DebugTick && perf.done('State Vars')

	cc.flags.DebugTick && perf.mark('Initial Tick')
	await stateTick(ns, -1)
	cc.flags.DebugTick && perf.done('Initial Tick')

	//cc.updateNodestep(ns, hostMap)
	cc.notifyUpstart(ns, hostMap)

	cc.flags.DebugTick && perf.done('Startup')
	cc.flags.DebugTick && ns.tprint(perf.fetch())

	let tick = 0
	do {
		perf = new Performance()

			// Shall we shut down the whole network?
			if ( cc.flags.KillAll ) {
				perf.mark('Shutdown')
				for (let node of network.nodes ) {
					for ( let script of WORKER_SCRIPTS ) {
						ns.scriptKill(script, node)
					}
				}
				perf.done('Shutdown')
				ns.tprint(perf.fetch())
				
				cc.flags.KillAll = false
				CC.save(cc)
			}

		cc.flags.DebugTick && perf.mark('stateTick')
		await stateTick(ns, tick)
		cc.flags.DebugTick && perf.done('stateTick')

		// Plan shallow RAM distribution
		let res = {
			_total: network.totalRAM,
			Harvester: 1
		}
		if (cc.flags.Charge) {
			res['Charge'] = cc.flags.ChargeAmount
			res['Harvester'] -= cc.flags.ChargeAmount
		}
		if (cc.flags.Share) {
			res['Share'] = cc.flags.ShareAmount
			res['Harvester'] -= cc.flags.ShareAmount
		}

		cc.flags.DebugTick && perf.mark('Plan.tick')
		plan.network.tick(ns, network, res)
		cc.flags.DebugTick && perf.done('Plan.tick')

		// Increment loop counter
		tick++

		cc.flags.DebugTick && perf.mark('sleep')
		// Keep program from crashing
		await ns.sleep(CC_CYCLE_PAUSE)
		cc.flags.DebugTick && perf.done('sleep')

		// Print debug info
		if (cc.flags.DebugTick) {
			ns.tprint(`Tick[${tick}]: \n${perf.fetch()}`)
		}
	} while (!cc.flags.RunOnce && !cc.flags.KillAll)

	// Print exit notification
	cc.notifyShutdown(ns)
	ns.tprint('Done.')

	ns.exit()
}

async function stateTick(ns, tick = 0) {
	const dbgUp = tick < 0 || cc.flags.DebugTick

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

	// SourceFile-6 Bladeburner
	if (cc.sourceFileLvl(6) > 0) await asyncRun(ns, 'task/update_bladeburner.js')

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