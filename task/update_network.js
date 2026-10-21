import { takeServer } from 'core/actions'
import { MIN_WORKER_RAM, OWN_SERVER_PREFIX, WORKER_SCRIPTS } from 'core/globals'
import { CC, Hosts, Memory } from 'state/index'

let cc
let hosts
let memory

/** @param {NS} ns **/
export async function main(ns) {
	cc = CC.load()
	hosts = Hosts.load()
	memory = Memory.load()

	// Reset running state
	memory.reset()

	// Do our job
	await analyzeScan(ns)

	// Run defrag
	memory.allocateSpaces()

	// Write our new state to storage
	Hosts.save(hosts)
	Memory.save(memory)
}

/** @param {NS} ns **/
export async function analyzeScan(ns) {
	hosts.owned = []
	hosts.targets = new Map()

	// Traverse our known universe
	for ( let host of hosts.hosts ) {
		// Skip orphan entries
		if (!ns.serverExists(host) || host == "darkweb") continue

		// Update calculated intel for hosts.servers[host]
		updateHost(ns, host)

		// Do we own the server yet?
		tryTakeServer(ns, host)

		// Is this a compute node?
		if (ns.hasRootAccess(host) && ns.getServerMaxRam(host) >= MIN_WORKER_RAM) {
			updateComputeNode(ns, host)
		}

		// Is hackable and has money
		if (
			ns.getServerMaxMoney(host) > 0 &&
			ns.getServerRequiredHackingLevel(host) <= ns.getHackingLevel() &&
			ns.hasRootAccess(host)
		) {
			// Add to farmable hosts
			hosts.targets.set(host, Math.floor(ns.getServerMaxMoney(host)))
		}

		if (
				ns.hasRootAccess(host) &&
				ns.getServerMaxRam(host) >= MIN_WORKER_RAM
			) {
				// Add as delegate node
				hosts.owned.push(host)
			}
	}

	// Sort targets by value descending
	hosts.targets = new Map(
		[...hosts.targets.entries()].sort((a, b) => b[1] - a[1])
	)
}

function tryTakeServer(ns, host) {
	if (
		!ns.hasRootAccess(host) &&
		ns.getServerRequiredHackingLevel(host) <= ns.getHackingLevel()
	) {
		// Try to take server
		if (takeServer(ns, host)) {
			!cc.flags.get('Silent') && cc.notify(ns, 'info', `Took over '{${host}}'`)
		}
	}
}

function updateHost(ns, host) {
	hosts.servers[host].hackTime = ns.getHackTime(host)
	hosts.servers[host].growTime = ns.getGrowTime(host)
	hosts.servers[host].weakenTime = ns.getWeakenTime(host)

	hosts.servers[host].hackAnalyzeChance = ns.hackAnalyzeChance(host)
		// Probably not needed, but let's keep it for now, replaced by Batch.hackPercentFor
		//hosts.servers[host].hackThreads = Math.ceil(ns.hackAnalyzeThreads(host, ns.getServerMaxMoney(host) * FARM_DESIRED_VOLUME))
	hosts.servers[host].percentPerHack = percentPerHack(ns, host)
}

/**
 * @param {NS} ns
 * @param {string} host
 * Updates the compute node state for a given host, registering its RAM and any running worker scripts.
 */
function updateComputeNode(ns, host) {
	let max = ns.getServerMaxRam(host), 
			isPrivate = host.indexOf(OWN_SERVER_PREFIX) > -1
	if (host == cc.host) {
		max -= cc.buffer
		isPrivate = true
	}
	if (max < MIN_WORKER_RAM) return

	memory.registerContingent(host, max, isPrivate)
	// Loop trough all running scripts
	ns.ps(host).forEach((proc) => {
		// Is this a worker?
		if (!WORKER_SCRIPTS.includes('/'+proc.filename)) return;

		memory.registerProcess(host, proc, ns.getRunningScript(proc.pid).threads)		
	})
}

function percentPerHack(ns, host) {
	const server = hosts.servers[host]

	const hackDifficulty = server.hackDifficulty ?? 100;
  if (hackDifficulty >= 100) return 0;
  const requiredHackingSkill = server.requiredHackingSkill ?? 1e9;
  // Adjust if needed for balancing. This is the divisor for the final calculation
  const balanceFactor = 240;

  const difficultyMult = (100 - hackDifficulty) / 100;
  const skillMult = (cc.player.skills.hacking - (requiredHackingSkill - 1)) / cc.player.skills.hacking;
  const percentMoneyHacked =
    (difficultyMult * skillMult * cc.player.mults.hacking_money * cc.nodeMults.ScriptHackMoney) / balanceFactor;

  return Math.min(1, Math.max(percentMoneyHacked, 0));
}