import { CC } from 'state/index'

export async function main(ns) {
	let cc = CC.load()

	for (let [name, ram] of cc.addServers) {
		let res = '' + ns.purchaseServer(name, ram)

		// See if server was bought
		if (res.length > 0) {
			!cc.flags.get('Silent') && cc.notify(ns,
				'success',
				`Purchasing server '${res}' with ${ram} for ${ns.nFormat(
					ns.getPurchasedServerCost(ram),
					'$0.000a'
				)}`,
				4000
			)
		} else {
			!cc.flags.get('Silent') && cc.notify(ns,
				'error',
				`Failed to purchase server, not enought money: ${ns.nFormat(
					ns.getPurchasedServerCost(ram),
					'$0.000a'
				)}`,
				4000
			)
		}
	}

	cc.addServers = []

	CC.save(cc)
}
