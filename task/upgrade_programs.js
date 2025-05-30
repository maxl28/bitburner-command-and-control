import { GAME_PROGRAMS } from 'core/globals'
import { CC } from 'state/index'


let cc

/** @param {NS} ns **/
export async function main(ns) {

	cc = CC.load()

	upgradePrograms(ns, ns.getPlayer().money * .75)
}

function upgradePrograms(ns, corpus) {

		// Do we need TOR access?
		if (!ns.getPlayer().tor && corpus >= 200 * 1000) {
			cc.notify(ns, 'error', 'Please manually buy a TOR modem!') 

			// Notify user
			//!cc.flags.get('Silent') && ns.purchaseTor() ? cc.notify(ns, 'success', 'Bought TOR modem!') : cc.notify(ns, 'error', 'Failed to purchase TOR modem!')
		}

		for (const prog of GAME_PROGRAMS) {

			// Check if we shall purchase this script
			if (
				// Do we need it?
				!ns.fileExists(prog[0], 'home') &&
				// Can we afford it?
				corpus >= prog[1]
			) {

				// Buy and notify user
				!cc.flags.get('Silent') && ns.purchaseProgram(prog[0]) ? 
					cc.notify(ns, 'success', `Purchasing program '${prog[0]}'...`) :
					cc.notify(ns, 'error', `Failed to purchase program '${prog[0]}'!`)
				
				ns.tprint(`[CC@${cc.host}] Purchasing program '${prog[0]}'...`)
			}
		}
	}
