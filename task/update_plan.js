import { CC, Network, Fragments, HostMap, Plan, Schedule } from 'state/index'
import { Pipeline, Task } from 'core/queue'
import { Batch } from 'core/batch'
import {
	FARM_DESIRED_VOLUME,
	FARM_THRESHOLD_HACK_CHANCE,
	FARM_MIN_VOLUME,
	MIN_WORKER_RAM,
	SCRIPT_COSTS
} from 'core/globals'

let cc, plan, fragments, network, hostMap, schedule

/** @param {NS} ns **/
export async function main(ns) {
	cc = CC.load()

	plan = Plan.load()

	hostMap = HostMap.load()
	network = Network.load()
	fragments = Fragments.load()
	schedule = Schedule.load()

	updateNetworkPlan(ns)

	Network.save(network)
	plan.save()
}

function updateNetworkPlan(ns) {
	// First allocate side jobs like charge and share to see whats left.
	planFlags(network.totalRAM)
	let totalRAM = Math.min(network.spaces.get('harvest'), network.freeRAM())
	network.space('harvest', totalRAM)

	// Go trough feasible targets by max_money desc
	for (let target of Array.from(network.targets.keys())) {
		if (totalRAM <= MIN_WORKER_RAM*3)	break

		// Pipeline title
		let key = `Harvest -${target}-`

		// Skip high-end / newly aqquired targets OR targets out of reach OR targets to uninterresting for us.
		if (
			Object.hasOwn(hostMap.servers[target], 'requiredHackingSkill') &&
			hostMap.servers[target].requiredHackingSkill > (ns.getPlayer().hackingLvl * .9)
		) {
			// Check if target is in current plan
			if (plan.network.has(key)) {
				// Nothing we can do with this host, remove from plan
				plan.network.delete(key)
			}

			//ns.tprint(`EXIT: target too high lvl for us: ${hostMap.servers[target].requiredHackingSkill} > ${ns.getPlayer().hacking}`)

			continue
		}

		// Prepare specific pipeline for this host.
		if (!plan.network.has(key))
			plan.network.appendEntry(new Pipeline('Sync', [], key))
		
		// Check if we need to push new tasks in this pipeline.
		if (plan.network.get(key).remaining() < 1) {
			if (schedule.batches.has(target) && schedule.batches.get(target) > (Date.now()+100)) {
				//ns.tprint('EXIT: target busy with batch: ', target)
				continue
			}

			let serv = hostMap.servers[target]

			// Assume we have evenly split the RAM for now.
			let chunkThreads = Math.floor(totalRAM / MIN_WORKER_RAM)
			let memSpace = 'harvest'

			if (serv.hackAnalyzeChance < FARM_THRESHOLD_HACK_CHANCE && serv.hackDifficulty >= serv.minDifficulty * 1.1) {
				// ToDo: prime server
				let tWeaken = Math.ceil(Math.min(chunkThreads, (serv.hackDifficulty - serv.baseDifficulty)*4))

				totalRAM -= tryBatch(ns, target, [
					[ Date.now(), Math.ceil(serv.weakenTime), 'weaken', memSpace, tWeaken, [target] ]
				])
				continue
			}

			if ( serv.moneyAvailable <= serv.moneyMax * FARM_MIN_VOLUME ) {
				let tGrow = Math.min(chunkThreads, Math.ceil(ns.growthAnalyze(target, serv.moneyAvailable < 1000 ? 200 : Math.max(1.1, serv.moneyMax / serv.moneyAvailable))))

				let totalCost = tryBatch(ns, target, [
					[ Date.now(), Math.ceil(serv.growTime), 'grow', memSpace, tGrow, [target] ],
					[ Date.now()+Math.ceil(Math.max(1,serv.growTime-serv.weakenTime)), Math.ceil(serv.weakenTime), 'weaken', memSpace, tGrow*2, [target] ]
				])

				totalRAM -= totalCost
				continue
			}
		

			let batchData = Batch.calc(ns, serv, FARM_DESIRED_VOLUME, chunkThreads, true)
			if (batchData == false) continue;
			
			totalRAM -= tryBatch(ns, target, batchData)
		} else {
			//ns.tprint(`EXIT: target busy with ${plan.network.get(key).remaining()} remaining tasks.`)
		}
	}

	plan.save()
	schedule.save()
	Network.save(network)
}

function tryBatch(ns, target, batches) {
	//ns.tprint(`BATCH: ${target}`)

	// Try and reserve memory on the network
	let success = [], totalCost = 0
	for ( let [start, duration, script, space, threads, args] of batches ) {
		const cost = SCRIPT_COSTS[`/worker/${script}.js`] * threads,
					wID  = `${target}_${start}`,
					end  = start + 10 + duration
		
		if (network.reserveChunkAt(ns, 'harvest', wID, cost, start, end)) {
			success.push(wID)
			totalCost += cost
		} else {
			success.forEach(el => network.freeChunksFor(el))
			return -1
		}
	}

	//ns.tprint(`BATCH: ${target} - ${success.length} tasks for ${totalCost} GB`)

	// Register all batches
	batches.forEach( el => schedule.add(ns, ...el))

	return totalCost
}

function planFlags(totalRAM) {
	let sFiles = cc.flags.get('Sf').split(',')
	let daemonRAM = 0, daemons = []

	if (cc.flags.get('Charge') > 0) {
		let chargeRAM = totalRAM * cc.flags.get('Charge')
		totalRAM -= chargeRAM

		network.space('charge', chargeRAM)

		if (!plan.network.has('Charge')) plan.network.appendEntry(new Pipeline('Sync', [], 'Charge'))
		
			while (plan.network.get('Charge').remaining() < 2 && fragments.state.size > 0) {
			let tasks = []
			for (let frag of Array.from(fragments.state.values())) {
				// Skip booster fragments
				if (frag.limit == 99) continue

				tasks.push(
					new Task(
						'/worker/charge.js',
						cc.scripts.get('/worker/charge.js'),
						'charge',
						10 * Math.floor(chargeRAM / 1.7 / fragments.used.length),
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
		let shareRAM = totalRAM * cc.flags.get('Share')
		totalRAM -= shareRAM

		network.space('share', shareRAM)

		if (!plan.network.has('Share')) plan.network.appendEntry(new Pipeline('Sync', [], 'Share'))
		if (plan.network.get('Share').remaining() < 2) {
			plan
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

	if ( daemons.length > 0 && daemonRAM < totalRAM*.45 ) {
		daemons.forEach( el => {
			if (!network.daemons.has(el[0])) network.daemons.set(el[0], el[1])
			daemonRAM += SCRIPT_COSTS[el[1]]
		})
		network.space('daemon', daemonRAM )

		totalRAM = Math.max(0, totalRAM - daemonRAM)
	}

	// Allocate remaining RAM to harvest
	network.space('harvest', totalRAM)
}
