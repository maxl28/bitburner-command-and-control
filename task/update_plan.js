import { CC, Network, Fragments, Hosts, Plan, Memory, Scheduler } from 'state/index'
import { Pipeline, Task } from 'core/queue'
import { Batch } from 'core/batch'
import {
	FARM_MAX_VOLUME,
	FARM_DESIRED_VOLUME,
	FARM_THRESHOLD_HACK_CHANCE,
	FARM_MIN_VOLUME,
	MIN_WORKER_RAM,
	SCRIPT_COSTS,
	CC_CYCLE_PAUSE,
} from 'core/globals'

let cc, plan, fragments, network, hosts, memory, scheduler

/** @param {NS} ns **/
export async function main(ns) {
	cc = CC.load()

	plan = Plan.load()

	hosts = Hosts.load()
	network = Network.load()
	fragments = Fragments.load()
	memory = Memory.load()
	scheduler = Scheduler.load()

	updateNetworkPlan(ns)

	plan.save()
	Memory.save(memory)
	Network.save(network)
	Scheduler.save(scheduler)
}

function updateNetworkPlan(ns) {
	// First allocate side jobs like charge and share , the rest goes to harvest.
	planFlags()
	let assignedRam = Math.max(
		memory._fetchProcRelation('space', 'harvest', true),
		Math.round(
			scheduler.consumptionAt(Date.now()+CC_CYCLE_PAUSE*5) * .6 * 100
		) / 100
	)
	let availableRam = memory.spaceSize('harvest') - assignedRam
	
	//ns.tprint("INFO: available RAM for harvest: ", ns.format.number(availableRam, 2), " GB usage ", ns.format.number(assignedRam, 2), " / ",ns.format.number(memory.spaceSize('harvest'), 2), " GB")
	
	if (availableRam <= MIN_WORKER_RAM*4) return;
	
	// Compile sorted hitlist.
	let hitlist = Array.from(hosts.targets.keys())
		.filter(hn => hn != null && hosts.servers[hn].hackAnalyzeChance > FARM_THRESHOLD_HACK_CHANCE)
		.sort((a,b) => {
			let s1 = hosts.servers[a], s2 = hosts.servers[b]
			return s1.hackAnalyzeChance*s1.moneyMax-s2.hackAnalyzeChance*s2.moneyMax
		})
		.reverse()

	// Go trough feasible targets by chance*max_money desc
	for (let target of hitlist) {
		if (availableRam <= MIN_WORKER_RAM*4)	break
		if (scheduler.isBusy(target)) continue;

		let batch = tryMakeBatch(ns, hosts.servers[target], availableRam)
		if (batch == null) continue;
		if (batch.consumption() > availableRam) {
			//ns.tprint("INFO: batch for ", target, " exceeds available RAM, skipping...")
			continue;
		}

		let rt = batch.runtime()
		//ns.tprint("NEW BATCH FOR ", target, " using ", ns.format.number(batch.consumption(), 2), " GB RAM")
		//ns.tprint(" > DEPLOY in ", rt[0] - Date.now(), " ms for ", rt[1] - rt[0], " ms")
		
		scheduler.addBatch(ns, batch, Date.now()+CC_CYCLE_PAUSE)
		availableRam -= batch.consumption()
	}
}

function tryMakeBatch(ns, srv, remainingRam, hackVolume = FARM_MAX_VOLUME) {
	const target = srv.hostname
		
	// If the server is not yet primed, we need to prime it first.
	if ( srv.moneyAvailable <= srv.moneyMax * FARM_DESIRED_VOLUME ) {		
		return new Batch(ns, target, Batch.prime(ns, srv, remainingRam, FARM_MAX_VOLUME))
	}

	let volume = Math.min(
			Batch.volume(ns, srv, remainingRam / MIN_WORKER_RAM),
			hackVolume
		)
		
		if (volume < FARM_MIN_VOLUME) {
			//ns.tprint("--> tryAddBatch failed for host "+target+ ": possible volume too low")
			return null
		}

		//ns.tprint("--> tryAddBatch for ",srv.hostname, " at ", volume)

	let data = Batch.makeData(ns, srv, volume)
	if (!data) return null

	return new Batch(ns, target, data)
}

function planFlags() {
	let sFiles = cc.flags.get('Sf').split(','), totalRAM = memory.totalRAM
	let daemonRAM = 0, daemons = [], total = 1

	if (cc.flags.get('Charge') > 0) {
		memory.registerSpace('charge',  cc.flags.get('Charge'))
		total -= cc.flags.get('Charge')
		
		let chargeRAM = memory.spaceSize('charge')
		if (!plan.network.has('Charge')) plan.network.appendEntry(new Pipeline('Sync', [], 'Charge'))
		
			while (plan.network.get('Charge').remaining() < 2 && fragments.state.size > 0) {
			let tasks = []
			for (let frag of Array.from(fragments.state.values())) {
				// Skip booster fragments
				if (frag.limit == 99) continue
				let script = '/worker/charge.js'

				tasks.push(
					new Task(
						script,
						SCRIPT_COSTS[script],
						'charge',
						Math.max(1, Math.floor(chargeRAM / SCRIPT_COSTS[script] / fragments.used.length)),
						[[frag.x, frag.y].join(',')]
					)
				)
			}

			plan.network
				.get('Charge')
				.appendEntry(new Pipeline('Async', tasks, `Batch@${Date.now()}`))
		}
	}
	if (cc.flags.get('Share') > 0) {
		memory.registerSpace('share',  cc.flags.get('Share'))
		total -= cc.flags.get('Share')
		
		let shareRAM = memory.spaceSize('share')
		if (!plan.network.has('Share')) plan.network.appendEntry(new Pipeline('Sync', [], 'Share'))
		if (plan.network.get('Share').remaining() < 2) {
			plan.network
				.get('Share')
				.appendEntry(
					new Task('/worker/share.js', cc.scripts.get('/worker/share.js'), 'share', 30 * Math.floor(shareRAM / 1.7), [])
				)
		}
	}
	if (sFiles.length > 0) {
		if ( sFiles.includes('7') ) {
			daemons.push(['bladeburner', '/worker/daemon_bladeburner.js'])
		}
	}

	// Run daemons if they consume less than X% of all RAM.
	if ( daemons.length > 0 && daemonRAM < totalRAM*.35 ) {
		daemons.forEach( el => {
			if (!network.daemons.has(el[0])) network.daemons.set(el[0], el[1])
			daemonRAM += SCRIPT_COSTS[el[1]]
		})

		let daemonPercent = Math.max(.0001, daemonRAM / memory.totalRAM) 
		memory.registerSpace('daemon', daemonPercent)
		total -= daemonPercent
	}

	// Allocate remaining RAM to harvest
	memory.registerSpace('harvest', total)
}
