import { 
	OWN_SERVER_BUY_CORPUS,
	OWN_SERVER_PREFIX,
	OWN_SERVER_IMPROVEMENT,
	OWN_SERVER_MAX_GB
} from 'core/globals'
import { formatMoney } from 'core/format'
import { CC, Network } from 'state/index'

let cc
let network
let nodeStepRaiseCounter = 0

/** @param {NS} ns **/
export async function main(ns) {

	cc = CC.load()
	network = Network.load()

	let hasChanged = true
	do {
		hasChanged = upgradeNetwork(ns, Math.floor(ns.getPlayer().money * OWN_SERVER_BUY_CORPUS))
	} while (hasChanged)

	Network.save(network)
}

function upgradeNetwork(ns, corpus) {
	// Aggregate all bought nodes
	const nodes = ns.getPurchasedServers()

	//ns.tprint(`[CC@${cc.host}] Upgrading network of ${nodes.length}/${ns.getPurchasedServerLimit()} with corpus \$${formatMoney(corpus)}`)

	// Can we double computing power?
	if (ns.getPurchasedServerCost(2 * cc.nodeStep) <= corpus && cc.nodeStep < OWN_SERVER_MAX_GB) {

		// Double power
		cc.nodeStep *= 2

		// Increase step counter
		nodeStepRaiseCounter++

		// Skip anything else, signal change to process
		return true
	}

	// Notify user about step change
	if (nodeStepRaiseCounter > 0) {

		let oldGB = cc.nodeStep
		for (var a = 0; a < nodeStepRaiseCounter; a++) oldGB /= 2

		!cc.flags.get('Silent') && cc.notify(ns,
			'info',
			`Raising node step ${formatMoney(oldGB)} -> ${formatMoney(cc.nodeStep)} GB`,
		)

		// Reset counter
		nodeStepRaiseCounter = 0

		CC.save(cc)
	}

	//ns.tprint(`[CC@${cc.host}] NodeStep at ${cc.nodeStep} GB / \$${formatMoney(ns.getPurchasedServerCost(cc.nodeStep))}`)

	// Can we obtain more computing power?
	if (
		// Can we afford a significant improvement?
		ns.getPurchasedServerCost(cc.nodeStep) <= corpus &&
		// Are there free slots?
		nodes.length < ns.getPurchasedServerLimit()
	) {
		ns.tprint(`[CC@${cc.host}] Purchasing new server for \$${ns.getPurchasedServerCost(cc.nodeStep)}`)

		// Try purchase server
		var res = ns.purchaseServer(OWN_SERVER_PREFIX, cc.nodeStep)

		// Check success
		if (res.length > 0) {

			// Add as delegate node
			network.nodes.push(res)

			// Notify user
			!cc.flags.get('Silent') && cc.notify(ns,
				'info',
				`Adding ${formatMoney(cc.nodeStep)} GB computing power: ${res}`
			)

			// Signal network change
			return true
		}
	}

	//ns.tprint(`[CC@${cc.host}] Can Upgrade: ${nodes.length * cc.nodeStep} > ${network.privateRAM} : ${nodes.length * cc.nodeStep > network.privateRAM}`)

	// Can we upgrade a private node?
	if (
		// Can we afford the upgrade?
		ns.getPurchasedServerCost(cc.nodeStep) <= corpus &&
		// Are we already at the server limit?
		nodes.length >= ns.getPurchasedServerLimit()
	) {
		// Find smallest outdated node
		var lastSize = cc.nodeStep,
			upgradeTarget = 0
		for (var psi = 0; psi < nodes.length; psi++) {

			// Mark target
			if (
				ns.getServerMaxRam(nodes[psi]) < cc.nodeStep &&
				ns.getServerMaxRam(nodes[psi]) <= lastSize &&
				nodes[psi] != "home"
			) {

				lastSize = ns.getServerMaxRam(nodes[psi])
				upgradeTarget = psi
			}
		}


		// Return if improvement not significant
		if (cc.nodeStep < lastSize * OWN_SERVER_IMPROVEMENT) return false;

		// Halt any scripts
		ns.killall(nodes[upgradeTarget])

		// Delete outdated node
		const hasDeleted = ns.deleteServer(nodes[upgradeTarget])

		hasDeleted ? 
			cc.notify(ns, 'success', `Removing outdated node {${nodes[upgradeTarget]}}`) :
			cc.notify(ns, 'error', `Failed to queue delete for outdate node {${nodes[upgradeTarget]}}`)

		// Signal network change
		return hasDeleted
	}

	// No changes to network
	return false
}