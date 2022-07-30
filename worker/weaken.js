/** @param {NS} ns **/
export async function main(ns) {

	const host 		= ns.args[0]
	const target 	= ns.args[1]

	// Check CLI flags
	if (!host || !target) {

		// Notify user about error
		ns.tprint("Usage: cmd_weaken.js [host] [target]")
		ns.toast(
			`{weaken@${host}} Failed to start`,
			'error',
			6*1000
		)

		ns.exit()
	}

	await ns.weaken(target)
}