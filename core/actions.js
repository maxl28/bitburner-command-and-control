/**
 * Try to open all possible ports and Nuke the server.
 * 
 * @param {NS} ns
 * @param {String} host
 * 
 * @return boolean
 */
export function takeServer(ns, host) {
		var num = 0

		if (ns.fileExists("BruteSSH.exe", "home")) {
			ns.brutessh(host)
			num++
		}
		if (ns.fileExists("FTPCrack.exe", "home")) {
			ns.ftpcrack(host)
			num++
		}
		if (ns.fileExists("SQLInject.exe", "home")) {
			ns.sqlinject(host)
			num++
		}
		if (ns.fileExists("HTTPWorm.exe", "home")) {
			ns.httpworm(host)
			num++
		}
		if (ns.fileExists("relaySMTP.exe", "home")) {
			ns.relaysmtp(host)
			num++
		}

		if (ns.getServerNumPortsRequired(host) <= num) {
			ns.nuke(host)

			return true
		}

		return false
	}