import { CC } from 'state/index'
import { asyncRun } from 'core/run'

export async function main(ns) {
  let cc = CC.load()

	// Update performance tracker info
	await asyncRun(ns, 'task/update_tracker.js')

	await asyncRun(ns, 'task/daemons.js')

  // Check if we can buy more programs
	if (cc.sourceFileLvl(4) > 0) await asyncRun(ns, 'task/upgrade_programs.js')

	// Buy or upgrade computing nodes, skip rest of sweep if network has changed
	await asyncRun(ns, 'task/upgrade_network.js')

	// Scan network for new contract files
	await asyncRun(ns, 'task/update_contracts.js')

	// Solve contracts in database
	let contractsSolved = await asyncRun(ns, 'task/solve_contracts.js')

	!cc.flags.get('Silent') && contractsSolved ? cc.notify(ns, 'info', 'Finished Contracts!') : cc.notify(ns, 'error', 'Failed Contracts!')

	// Are we doing HNET?
	if (!cc.flags.get('NoHnet')) {
		let hnetUpgrade = await asyncRun(ns, 'task/upgrade_hnet.js')

		// Process HNET upgrade
		!cc.flags.get('Silent') && hnetUpgrade ? cc.notify(ns, 'info', 'HNET upgrade...') : cc.notify(ns, 'error', 'Failed HNET upgrade!')
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