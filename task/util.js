import { CC } from 'state/index'
import { asyncRun } from 'core/run'

export async function main(ns) {
  let cc = CC.load()

	// Update performance tracker info
	await asyncRun(ns, 'task/update_tracker.js')

  // Check if we can buy more programs
	if (cc.sourceFileLvl(4) > 0) await asyncRun(ns, 'task/upgrade_programs.js')

	// Buy or upgrade computing nodes, skip rest of sweep if network has changed
	await asyncRun(ns, 'task/upgrade_network.js')

	// Scan network for new contract files
	await asyncRun(ns, 'task/update_contracts.js')

	// Solve contracts in database
	let contractsSolved = await asyncRun(ns, 'task/solve_contracts.js')

	!cc.flags.Silent && ns.toast(
		`[CC@${cc.host}] Solving contracts...`,
		contractsSolved ? 'info' : 'error',
		10 * 1000
	)

	// Are we doing HNET?
	if (!cc.flags.NoHnet) {
		let hnetUpgrade = await asyncRun(ns, 'task/upgrade_hnet.js')

		// Process HNET upgrade
		!cc.flags.Silent && ns.toast(
			`[CC@${cc.host}] HNET upgrade...`,
			hnetUpgrade ? 'info' : 'error',
			10 * 1000
		)
	}
	
	// Does it make sense to auto-trade yet?
	/*
	if (ns.getPlayer().money >= 5 * 1000 * 1000 * 1000) {
		// Is trader halted?
		if (!ns.isRunning('trdr.js', cc.host)) {
			ns.toast(
				`[CC@${cc.host}] Starting Trader...`,
				ns.exec('trdr.js', cc.host) > 0 ? 'info' : 'error',
				10 * 1000
			)
		}
	}*/
}