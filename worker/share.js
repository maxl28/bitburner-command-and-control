/** @param {NS} ns **/
export async function main(ns) {

	for ( let i = 0; i < 20; i++ ) {
		await ns.share()
	}
}