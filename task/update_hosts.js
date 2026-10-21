import { Hosts } from 'state/index'

/** @param Hosts */
let hosts 

/** @param {NS} ns **/
export async function main(ns) {

	hosts = Hosts.load()

	// Check if our map is empty
	if (!hosts.hasOwnProperty('hosts') || hosts.hosts.length == 0) {
		
		// Set default values
		hosts = new Hosts()

		// Do a deep scan
		fullScan(ns, 'home', 6)
	}

	// Expand our current would outwards
	updateScan(ns, 2)

	hosts.purchased = ns.cloud.getServerNames()

	// Save result to storage
	Hosts.save(hosts)
}

/** @param {NS} ns **/
function fullScan(ns, origin = "home", depth = 1) {

	// Add host to list if not already indexed
	if (!hosts.hosts.includes(origin)) hosts.hosts.push(origin)
	if (!hosts.neighbours.has(origin)) hosts.neighbours.set(origin, [])

	hosts.servers[origin] = ns.getServer(origin)

	// Exit on max depth reached
	if (depth < 0) return

	// Go trough every neighbouring node
	ns.scan(origin).forEach(host => { 
		
		// Add neighbouring node if not already in list
		if (!hosts.neighbours.get(origin).includes(host)) hosts.neighbours.get(origin).push(host)

		// Scan one level deeper
		fullScan(ns, host, depth - 1)	
	})
}

/** @param {NS} ns **/
function updateScan(ns, depth = 2) {

	// Traverse known universe
	hosts.hosts.forEach((origin, i) => {

		// Remove orphan entries, scan valid hosts
		if (!ns.serverExists(origin)) hosts.hosts.splice(i, 1)
		else fullScan(ns, origin, depth)
	})
}