/** @param {NS} ns **/
export async function main(ns) {

	let hostname = ns.args.splice(0,1)

	// Remove UID from args
	ns.args.splice(-2, 2)

	if (ns.args.length < 1) {
		
		ns.print(`charge@${hostname} Error: no fragments.`)
		ns.exit()
	}
	
	let frags = []
	for (let arg of ns.args) {
		
		let frag = arg.split(',')

		if (frag.length != 2) {

			ns.print(`charge@${hostname} Error: invalid fragment ${arg}.`)
			ns.exit()
		}

		frags.push([parseInt(frag[0]), parseInt(frag[1])])
	}

	for ( let i = 0; i < 50; i++ ) {
		let frag

		try {
			for(frag of frags)  {
				await ns.stanek.chargeFragment(frag[0], frag[1])
			}
		} catch (e) {
			// Fragment makup has changed, kill process.
			ns.print(`charge@${hostname} Error: fragment no longer exists: ${frag}`)
			ns.exit()
		}
	}
}