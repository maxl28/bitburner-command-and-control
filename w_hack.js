/** @param {NS} ns **/
export async function main(ns) {

	const host 		= ns.args[0]
	const target 	= ns.args[1]

	// Check CLI flags
	if (!host || !target) {

		// Notify user about error
		ns.tprint("Usage: cmd_hack.js [host] [target]")
		ns.toast(
			`{hack@${host}} Failed to start`,
			'error',
			6*1000
		)

		ns.exit()
	}

	var gain = await ns.hack(target)

	/*
	ns.tprint(
		`{hack@${host}} gained ${ns.nFormat(gain, '$0.000a')} from '${target}'`
	)*/
}