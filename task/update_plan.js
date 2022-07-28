import { CC, Network, Fragments, HostMap, Plan } from 'state/index'
import { Pipeline, Task } from 'core/queue'
import {
	FARM_MIN_TARGETS,
	FARM_TARGET_PERCENTAGE,
	FARM_THRESHOLD_HACK_CHANCE,
	FARM_MIN_VOLUME,
	FARM_MAX_VOLUME,
	MIN_WORKER_RAM
} from 'core/globals'

let cc, plan, fragments, network, hostMap

/** @param {NS} ns **/
export async function main(ns) {
	cc = CC.load()

	plan = Plan.load()

	hostMap = HostMap.load()
	network = Network.load()
	fragments = Fragments.load()

	updateNetworkPlan(ns)

	Network.save(network)
	plan.save()
}

function updateNetworkPlan(ns) {
	let totalRAM = planFlags(network.totalRAM)

	// Assume plan saturated
	if (!plan.network.has('Harvester'))
		plan.network.appendEntry(new Pipeline('Async', [], 'Harvester'))
	let maxTargets = Math.max(
		FARM_MIN_TARGETS,
		Math.ceil(network.targets.size * FARM_TARGET_PERCENTAGE)
	)
	let choosenTargets = 0

	//console.log('-----------')
	//console.log('-- BEGIN --')
	
	// Go trough possible targets by max_money desc
	for (let target of Array.from(network.targets.keys())) {
		// Escape if maximum target count reached
		if (choosenTargets >= maxTargets) break

		// Pipeline title
		let key = `Harvest -${target}-`

		//console.log('EVAL: ' + target)

		// Skip high-end / newly aqquired targets OR targets out of reach OR targets to uninterresting for us.
		if (
			hostMap.servers[target].requiredHackingSkill > 1 &&
			(hostMap.servers[target].requiredHackingSkill >
			(ns.getPlayer().hacking - ns.getPlayer().hacking * 0.1))
		) {
			// Check if target is in current plan
			if (plan.network.has(key)) {
				// Nothing we can do with this host, remove from plan
				plan.network.get('Harvester').delete(key)
			}

			continue
		}

		// Prepare specific pipeline for this host.
		if (!plan.network.get('Harvester').has(key))
			plan.network.get('Harvester').appendEntry(new Pipeline('Sync', [], key))
		
		// Check if we need to push new tasks in this pipeline.
		if (plan.network.get('Harvester').get(key).remaining() < 1) {
			// Data batch for this host
			let data = []

			//console.log(' > PREPARE DATA < ')

			// Assume we have evenly split the RAM for now.
			let batchRAM = totalRAM / maxTargets,
				chunkThreads = Math.floor(batchRAM / MIN_WORKER_RAM)

			// Constants describing time relation between hack <- grow, weaken, etc.
			const weakenMul =
				hostMap.servers[target].weakenTime / hostMap.servers[target].hackTime
			const growMul =
				hostMap.servers[target].growTime / hostMap.servers[target].hackTime

			// Target intel
			const hackChance = ns.hackAnalyzeChance(target)
			const targetVolume =
				Math.floor(
					hostMap.servers[target].moneyAvailable /
						(hostMap.servers[target].moneyMax / 100)
				) / 100
			
			// Hack thread count we're going to calculate with.
			const hHackThreads = Math.floor(Math.min(chunkThreads, ns.hackAnalyzeThreads(target, Math.max(
				0,
				hostMap.servers[target].moneyMax * targetVolume)))),
			// Amount of ns.grow threads needed to counter our ns.hacks.
				hGrowThreads = hHackThreads * 2,
			// Accumulated target security increase
				hSecIncrease = ns.hackAnalyzeSecurity(hHackThreads) + ns.growthAnalyzeSecurity(hGrowThreads)
			// Start value for weaken thread count.
			let hWeakenThreads = hGrowThreads
			
			// Calculate weaken threads needed to counter hack & grow.
			let last_delta = 99,
					cntr = 0
			do {
				// Test security decrease.
				let secDecrease = ns.weakenAnalyze(hWeakenThreads)

				// Correct thread count up or down.
				if (secDecrease < hSecIncrease) {
					last_delta = secDecrease / hSecIncrease
					hWeakenThreads = hWeakenThreads + Math.ceil( hWeakenThreads * last_delta )
				} else {
					last_delta = hSecIncrease / secDecrease
					hWeakenThreads = hWeakenThreads - Math.floor( hWeakenThreads * last_delta )
				}

				// Prevent infinity loops on ping-pong limes behaviour.
				cntr++
			} while ( last_delta > 1 && cntr < 200 )
			// Correct thread count back from float
			hWeakenThreads = Math.round(hWeakenThreads)

			// Prepare harvest batch
			data = [
				// Add commands accumulated until now.
				...data,
				// Weaken server if hack chance too low.
				...(hackChance < FARM_THRESHOLD_HACK_CHANCE &&
					hostMap.servers[target].hackDifficulty > hostMap.servers[target].minDifficulty
					? splitTaskByMultiplier(
							weakenMul,
							'w_weaken.js',
							chunkThreads,
							target
					  )
					: []),
				// Grow server if too little available money.
				...(targetVolume <= FARM_MAX_VOLUME
					? [
							...splitTaskByMultiplier(growMul, 'w_grow.js', chunkThreads / 2, target),
							...splitTaskByMultiplier(weakenMul, 'w_weaken.js', chunkThreads / 2, target)
						]: []),
				// In any case, try to get some money!
				...(hackChance > FARM_THRESHOLD_HACK_CHANCE &&
				(targetVolume >= FARM_MIN_VOLUME || hostMap.servers[target].moneyAvailable > (ns.getPlayer().money * 2))
					? [
							...splitTaskByMultiplier(
								(1 + (1- hackChance)),
								'w_hack.js',
								hHackThreads,
								target
							),
							...splitTaskByMultiplier(
								hackChance * growMul,
								'w_grow.js',
								hGrowThreads,
								target
							),
							...splitTaskByMultiplier(
								hackChance * weakenMul,
								'w_weaken.js',
								hWeakenThreads,
								target
							),
					  ]
					: [])
			]
			
			//console.log('Tasks: ', data.length)
			
			if ( data.length > 0 ) {
				// Add task batch to plan
				plan.network
				.get('Harvester')
				.get(key)
				.appendEntry(new Pipeline('Async', data, 'Yield@' + Date.now()))
			}
		}

		choosenTargets++
	}

	//console.log('--- END ---')
	//console.log('-----------')

	plan.save()
}

function planFlags(totalRAM) {
	if (cc.flags.Charge) {
		let chargeRAM = totalRAM * cc.flags.ChargeAmount
		totalRAM -= chargeRAM

		if (!plan.network.has('Charge'))
			plan.network.appendEntry(new Pipeline('Sync', [], 'Charge'))
		while (plan.network.get('Charge').remaining() < 2) {
			let tasks = []
			for (let frag of Array.from(fragments.state.values())) {
				// Skip booster fragments
				if (frag.limit == 99) continue

				tasks.push(
					new Task(
						'w_charge.js',
						cc.scripts.get('w_charge.js'),
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
	if (cc.flags.Share) {
		let shareRAM = totalRAM * cc.flags.ShareAmount
		totalRAM -= shareRAM

		if (!plan.network.has('Share')) plan.network.appendEntry(new Pipeline('Sync', [], 'Share'))
		if (plan.network.get('Share').remaining() < 2) {
			plan
				.get('Share')
				.appendEntry(
					new Task('w_share.js', cc.scripts.get('w_share.js'), 30 * Math.floor(shareRAM / 1.7), [])
				)
		}
	}

	return totalRAM
}

function splitTaskByMultiplier(mult, script, threads, ...args) {
	let tasks = []

	// ToDo: Remove this whole function! Circumvent for now
	mult = 1

	let childThreads = Math.floor(threads / mult)

	for (let i = 0; i < mult; i++) {
		if (i == Math.ceil(mult)) {
			// Add overhang threads to last child
			tasks.push(
				new Task(script, cc.scripts.get(script), childThreads + (threads - i * childThreads), [...args])
			)
		} else {
			tasks.push(new Task(script, cc.scripts.get(script), childThreads, [...args]))
		}
	}

	return tasks
}
