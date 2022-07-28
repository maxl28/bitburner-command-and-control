import { takeServer } from 'core/actions'
import { MIN_WORKER_RAM, OWN_SERVER_PREFIX, WORKER_SCRIPTS } from 'core/globals'
import { CC, HostMap, Network } from 'state/index'

let cc
let hostMap
let network

/** @param {NS} ns **/
export async function main(ns) {
	cc = CC.load()
	hostMap = HostMap.load()

	// Reset network state, preserve RAM chunks
	network = Network.load()
	const chunks = network.chunks
	network = new Network()
	network.chunks = chunks

	// Do our job
	await analyzeScan(ns)

	// Write our new state to storage
	Network.save(network)
	HostMap.save(hostMap)
}

/** @param {NS} ns **/
export async function analyzeScan(ns) {
	// Traverse our known universe
	for ( let host of hostMap.hosts ) {
		// Skip orphan entries
		if (!ns.serverExists(host)) continue

		hostMap.servers[host].hackTime = ns.getHackTime(host)
		hostMap.servers[host].growTime = ns.getGrowTime(host)
		hostMap.servers[host].weakenTime = ns.getWeakenTime(host)

		// Do we own the server yet?
		tryTakeServer(ns, host)

		const maxRAM = ns.getServerMaxRam(host)

		// Is this a compute node?
		if (ns.hasRootAccess(host) && maxRAM > MIN_WORKER_RAM) {
			// Calc network compute power
			network.totalRAM += maxRAM

			// Gather intel about host
			let max = maxRAM,
				used = ns.getServerUsedRam(host)

			if (host.indexOf(OWN_SERVER_PREFIX) > -1) network.privateRAM += max
			else if (host == cc.host) {
				max -= cc.buffer
				network.privateRAM += max
			}

			// Do we have free computing power?
			if (used < max && max - used > MIN_WORKER_RAM) {
				// Add free resources on this node to network available
				network.state.get('__free').push([host, max - used])
			}

			// Loop trough all running scripts
			ns.ps(host).forEach((proc) => {
				// Is this a worker?
				if (WORKER_SCRIPTS.includes(proc.filename)) {
					// Extract cmd string
					var cmd = proc.filename.slice(2, -3)
					if (cmd != 'share') cmd += ' ' + proc.args[1]

					const cost =
							ns.getRunningScript(proc.pid).threads *
							ns.getScriptRam(proc.filename, host),
						wID = proc.args.length > 2 ? proc.args[proc.args.length - 2] : ''

					network.state.get('__taken').push([wID, cost, host])
					if (!network.taken.has(wID)) network.taken.set(wID, 0)
					network.taken.set(wID, network.taken.get(wID) + cost)

					// Add worker to state
					network.state.set(
						cmd,
						(network.state.has(cmd) ? network.state.get(cmd) : 0) + cost
					)
				}
			})
		}

		// Is hackable and has money
		if (
			ns.getServerMaxMoney(host) > 0 &&
			ns.getServerRequiredHackingLevel(host) <= ns.getHackingLevel() &&
			ns.hasRootAccess(host)
		) {
			// Add to farmable hosts
			network.targets.set(host, Math.floor(ns.getServerMaxMoney(host)))
		}

		// Skip if we already have this host
		if (network.nodes.indexOf(host) < 0) {
			// Can we compute on this?
			if (
				ns.hasRootAccess(host) &&
				ns.getServerMaxRam(host) >= MIN_WORKER_RAM
			) {
				// Add as delegate node
				network.nodes.push(host)
			}
		}
	}

	// Sort targets by value descending
	network.targets = new Map(
		[...network.targets.entries()].sort((a, b) => b[1] - a[1])
	)
}

function tryTakeServer(ns, host) {
	if (
		!ns.hasRootAccess(host) &&
		ns.getServerRequiredHackingLevel(host) <= ns.getHackingLevel()
	) {
		// Try to take server
		if (takeServer(ns, host)) {
			!cc.flags.Silent && ns.toast(`[CC@${cc.host}] Took over '{${host}}'`, 'info', 10 * 1000)
		}
	}
}
