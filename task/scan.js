import { HostMap } from 'state/index'

/** @param HostMap */
let hostMap 

/** @param {NS} ns **/
export async function main(ns) {

	hostMap = HostMap.load()

	// Check if our map is empty
	if (!hostMap.hasOwnProperty('hosts') || hostMap.hosts.length == 0) {
		
		// Set default values
		hostMap = new HostMap()

		// Do a deep scan
		fullScan(ns, 'home', 6)
	}

	// Expand our current would outwards
	updateScan(ns, 2)

	hostMap.purchased = ns.getPurchasedServers()

	// Save result to storage
	HostMap.save(hostMap)
}

/** @param {NS} ns **/
function fullScan(ns, origin = "home", depth = 1) {

	// Add host to list if not already indexed
	if (!hostMap.hosts.includes(origin)) hostMap.hosts.push(origin)
	if (!hostMap.neighbours.has(origin)) hostMap.neighbours.set(origin, [])

	hostMap.servers[origin] = ns.getServer(origin)

	// Exit on max depth reached
	if (depth < 0) return

	// Go trough every neighbouring node
	ns.scan(origin).forEach(host => { 
		
		// Add neighbouring node if not already in list
		if (!hostMap.neighbours.get(origin).includes(host)) hostMap.neighbours.get(origin).push(host)

		// Scan one level deeper
		fullScan(ns, host, depth - 1)	
	})
}

/** @param {NS} ns **/
function updateScan(ns, depth = 2) {

	// Traverse known universe
	hostMap.hosts.forEach((origin, i) => {

		// Remove orphan entries, scan valid hosts
		if (!ns.serverExists(origin)) hostMap.hosts.splice(i, 1)
		else fullScan(ns, origin, depth)
	})
}