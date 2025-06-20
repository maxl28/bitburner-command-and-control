import { CC } from 'state/index'

export async function main(ns) {
	let cc = CC.load()

	let failed = []
	for (let node of cc.deleteServers) {
		// Halt any scripts
		ns.killall(node)

    const success = ns.deleteServer(node)

    if (success) {
      !cc.flags.get('Silent') && cc.notify(ns,
        'warning',
        `Removed node '${node}'`,
        4 * 1000
      )
    } else {
      failed.push(node)
    }
	}

  cc.deleteServers = failed

  CC.save(cc)
}
