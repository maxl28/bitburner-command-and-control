import { GAME_PROGRAMS } from 'core/globals'
import { CC } from 'state/index'


let cc

/** @param {NS} ns **/
export async function main(ns) {

	cc = CC.load()

	//upgradePrograms(ns, ns.getPlayer().money * .75)
}

function upgradePrograms(ns, corpus) {

		// Do we need TOR access?
		if (!ns.getPlayer().tor && corpus >= 200 * 1000) {

			// Notify user
			!cc.flags.Silent && ns.toast(
				`[CC@${cc.host}] Buying TOR modem...`,
				ns.purchaseTor() ? 'info' : 'error',
				10 * 1000
			)
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
				!cc.flags.Silent && ns.toast(
					`[CC@${cc.host}] Purchasing program '${prog[0]}'...`,
					ns.purchaseProgram(prog[0]) ? 'success' : 'error',
					10 * 1000
				)
				ns.tprint(`[CC@${cc.host}] Purchasing program '${prog[0]}'...`)
			}
		}
	}
