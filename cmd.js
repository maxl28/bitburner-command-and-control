import {
	formatMoney,
	formatTable,
	formatBarGraph,
	formatPipe,
	formatNodeMap
} from 'core/format'
import { Network, HostMap, Fragments, CC, Tracker, Plan } from 'state/index'
import { Flags } from 'core/flags'
import { OWN_SERVER_PREFIX, WORKER_SCRIPTS, MIN_WORKER_RAM, GAME_FRAGMENTS } from 'core/globals'
import { graphify } from 'core/util'

const ACTIONS = new Flags([
	['clean', false, ['Wipe state, meaning delete all entries to Electron\'s local storage.'].join('\n')],
	['addserver', false, ['Add a new server with the given GB count. Only use powers of 2, eg. 2, 4, 8, 16...'].join('\n')],
	['rmserver', false, ['Delete a existing private server by hostname.'].join('\n')],
	['inspect', false, ['Show detailed information about a host.'].join('\n')],
	['info', false, ['Environment information.'].join('\n')],
	['backdoors', false, ['List all vulnerable servers without backdoors.'].join('\n')],
	['plan', false, ['Print the current network queue. Use second parameter \'i\' for detailed view.'].join('\n')],
	['memory', false, ['Print current memory consumption.'].join('\n')],
	['tracker', false, ['Show script and hnet stats since last nuke.'].join('\n')],
	['hostmap', false, ['Print all hosts and their connections as hierarchical graph.'].join('\n')],
	['env', false, ['More environment information.'].join('\n')],
	['pattern', false, ['Load a Stanek\'s Gift pattern from /data/patterns or export the current one.'].join('\n')],
	['contract', false, ['Show information about contract file. Give file- and hostname as parameters.'].join('\n')],
	['ramlist', false, ['Show scripts files with ram use on given host.'].join('\n')],
])
const ACTIONS_TRACKER = [
	'scripts',
	'hacknet'
]

export function autocomplete(data, args) {
	if (args.length > 1 && args[0] == "env") return [...(Object.entries((new CC()).debug).map(v => v[0]))]
	if (args.length == 2 && args[0] == "pattern") { return ['in', 'out', 'convert', 'ls'] }
	else if (args.length == 3 && args[0] == "pattern" && args[1] == "in") { return [...data.txts] }
	else if (args.length > 1 && args[0] != 'tracker') return [...data.servers]
	else if (args[0] == 'tracker') return [...ACTIONS_TRACKER]
	else if (args.length == 1) return [...ACTIONS.keys()]
}

let hostMap, network, fragments, cc, tracker, plan;

/** @param {NS} ns **/
export async function main(ns) {
	ACTIONS.parse(ns)

	if ( ns.args.includes('help') ) {
		ns.tprint(ACTIONS.help())
		ns.exit()
	}

	hostMap 		= HostMap.load()
	network 		= Network.load()
	fragments 	= Fragments.load()
	cc 					= CC.load()
	tracker 		= Tracker.load()
	plan 				= Plan.load()

	if (ns.args.length < 1) {
		ns.tprint('please supply a command.')
		return
	}

	if (typeof this['act_'+ns.args[0]] === 'function') {
		return this['act_'+ns.args[0]](ns)
	} else {
		ns.tprint('error: action not found, please use help to list all available actions.')
	}
}

function act_clean(ns) {
	// Reset state in localStorage
	localStorage.clear()
	ns.tprint('State reset: ', localStorage)

	// Restore tracking information
	Tracker.save(tracker)
}
function act_addServ(ns) {
	var ram = ns.args[1]

	if (!ram) {
		ns.tprint('usage: addserver [ram]')
		return
		}

	cc.addServers.push([OWN_SERVER_PREFIX, ram])
	CC.save(cc)
}
function act_rmserv(ns) {
	let name = ns.args[1]

	if (name == null) {
		ns.tprint('usage: rmserver [name]')
		return
	}

	cc.deleteServers.push(name)
	CC.save(cc)
}
function act_inspect(ns) {
	let name = ns.args[1]

	if (name == null) {
		ns.tprint('usage: inspect [name]')
		return
	}

	// Check if valid server
	if (!ns.serverExists(name)) {
		ns.tprint(`Host '${name}' does not exist.`)
		ns.exit()
	}

	const sr = hostMap.servers[name]

	var tPrint = ''

	let runningCMDs = new Map()
	ns.ps(name).forEach((proc) => {
		let cmd = proc.filename.slice(8, -3)

		if (WORKER_SCRIPTS.includes(proc.filename)) {
			if (proc.args.length > 1) cmd += ' ' + proc.args[1]

			// Add cmd to list of running ones if not present
			!runningCMDs.has(cmd) && runningCMDs.set(cmd, [0,0,0]) // Map of CMD -> [RunTime, Gain]

			let cmdYield = 0
			switch (cmd.split(' ')[0]) {
				case 'hack':
					cmdYield =
						ns.hackAnalyze(name) *
						proc.threads *
						ns.getServerMoneyAvailable(proc.args[1])

					runningCMDs.set(
						cmd,
						[
							sr.hackTime,
							(
								runningCMDs.get(cmd)[1] + 
								cmdYield / (sr.hackTime / 1000)
							),
							runningCMDs.get(cmd)[2] + proc.threads
						]
					)
					break

				case 'grow':
					cmdYield = proc.threads / ns.growthAnalyze(name, 1, 1)

					runningCMDs.set(
						cmd,
						[
							sr.growTime,
							cmdYield / (sr.growTime / 1000),
							runningCMDs.get(cmd)[2] + proc.threads
						]
					)
					break

				case 'weaken':
					cmdYield = ns.weakenAnalyze(proc.threads, 1) // Assume one CPU core always, might yield false results on 'home'


					runningCMDs.set(
						cmd,
						[
							sr.weakenTime,
							cmdYield / (sr.weakenTime / 1000),
							runningCMDs.get(cmd)[2] + proc.threads
						]
					)
					break
				
				case 'charge':
					runningCMDs.set(
						cmd,
						[
							sr.weakenTime,
							runningCMDs.get(cmd)[1] + proc.threads,
							runningCMDs.get(cmd)[2] + proc.threads
						]
					)
					break
			}
		}

		for( let cmd of Array.from(runningCMDs.keys()) ) {
			let runtime = runningCMDs.get(cmd)[0],
					cmdYield = runningCMDs.get(cmd)[1],
					threads = runningCMDs.get(cmd)[2],
					cmdRam = ns.getScriptRam(`worker/${cmd.split(' ')[0]}.js`, name)


			tPrint += `+ '${cmd}' @ ${threads * cmdRam} GB yields ${cmdYield}\n`
			tPrint += `+++ Runtime: ${Math.floor(runtime / 60) + 'min '}`
		}
	})

	var out = `
------------------------------------------------------------------------------------------------
Inspect [${name}] ${sr.organizationName ? sr.organizationName : ''}
		
- Flags -
+ Owned   		: ${sr.hasAdminRights}
+ Private 		: ${sr.purchasedByPlayer}
+ Backdoor		: ${sr.backdoorInstalled}
+ Exec			: ${ns.hasRootAccess(name)}

- Stats -
+ Ports			: ${sr.openPortCount} / ${sr.numOpenPortsRequired}
+ Cores			: ${sr.cpuCores}
+ RAM			: ${sr.ramUsed} / ${sr.maxRam} GB
+ Money			: ${formatMoney(Math.floor(sr.moneyAvailable))} / ${formatMoney(
		Math.floor(sr.moneyMax)
	)} \$

- CMDs -
${tPrint}
- Info - 
+ Req			: ${sr.requiredHackingSkill}
+ Hack 			: ${Math.round(ns.hackAnalyzeChance(name) * 100).toFixed(3)} %
+ Sec			: ${sr.hackDifficulty}
+ Growth  		: ${sr.serverGrowth}
------------------------------------------------------------------------------------------------`

	ns.tprint(out)
}
function act_backdoors(ns) {
	ns.tprint('Hacked servers without backdoor:')

	hostMap.hosts.forEach((host) => {
		var sr = hostMap.servers[host]

		if (
			host.indexOf(OWN_SERVER_PREFIX) < 0 &&
			ns.hasRootAccess(host) &&
			host != 'home' &&
			!sr.backdoorInstalled &&
			sr.requiredHackingSkill <= ns.getHackingLevel()
		) {
			ns.tprint(host)
		}
	})
}
function act_info(ns) {
	let running = 0,
				bd = 0,
				totalThreads = 0,
				totalCores = 0

			let ramMap = new Map(),
				networkMap = new Map(),
				gainMap = new Map(),
				threadMap = new Map(),
				jobMap = new Map(),
				networkRam = 0
			for (let host of hostMap.hosts) {

				if (network.nodes.includes(host)) {
					running++
					hostMap.servers[host].backdoorInstalled && bd++
					ns.ps(host).forEach((proc) => {
						if (
							proc.args.length >= 3 &&
							WORKER_SCRIPTS.includes(proc.filename)
						) {
							let jID = proc.args[proc.args.length - 2]

							if (!jobMap.has(jID)) jobMap.set(jID, 0)
							jobMap.set(jID, jobMap.get(jID) + proc.threads)
						}

						cmd = proc.filename.slice(8, -3)
						if (proc.args.length > 1) cmd += ' ' + proc.args[1]

						totalThreads += proc.threads
						totalCores += hostMap.servers[host].cpuCores

						// Add to total RAM
						var cmdTotalRAM = ramMap.has(cmd) ? ramMap.get(cmd) : 0
						cmdTotalRAM +=
							ns.getRunningScript(proc.filename, host, ...proc.args).threads *
							ns.getScriptRam(proc.filename, host)
						networkRam +=
							ns.getRunningScript(proc.filename, host, ...proc.args).threads *
							ns.getScriptRam(proc.filename, host)
						ramMap.set(cmd, cmdTotalRAM)

						// Add to computing node list
						var usedNodes = networkMap.has(cmd) ? networkMap.get(cmd) : 0
						usedNodes += hostMap.servers[host].cpuCores
						networkMap.set(cmd, usedNodes)

						// Add to thread list
						var usedThreads = threadMap.has(cmd) ? threadMap.get(cmd) : 0
						usedThreads += proc.threads
						threadMap.set(cmd, usedThreads)

						// Add to computig node gain list
						var gain = 0
						switch (cmd.split(' ')[0]) {
							case 'hack':
								var bounty =
									ns.hackAnalyze(host) *
									proc.threads *
									ns.getServerMoneyAvailable(proc.args[1])
								gain += bounty / (hostMap.servers[proc.args[1]].hackTime / 1000)
								break

							case 'grow':
								var bounty = ns.growthAnalyzeSecurity(proc.threads)
								gain += bounty / (hostMap.servers[proc.args[1]].growTime / 1000)
								break

							case 'weaken':
								var bounty = ns.weakenAnalyze(proc.threads)
								gain += bounty / (hostMap.servers[proc.args[1]].weakenTime / 1000)
								break
						}
						var cmdTotalGain = gainMap.has(cmd) ? gainMap.get(cmd) : 0
						cmdTotalGain += gain
						gainMap.set(cmd, cmdTotalGain)
					})
				}
			}

			var tPrint = ''

			// Skip free and taken resources entry
			for (var i = 2; i < network.state.size; i++) {
				var cmd = Array.from(network.state.keys())[i]

				tPrint += `+ '${cmd}' with ${ns.nFormat(
					threadMap.get(cmd),
					'0a'
				)} thread(s) @ ${formatMoney(
					Math.floor(network.state.get(cmd))
				)} GB / ${networkMap.has(cmd) ? networkMap.get(cmd) : 0} cores(s)\n`
				if (!cmd.includes('charge') && !cmd.includes('share')) {
					var target = cmd.split(' ')[1]
					var fullPercent =
						ns.getServerMoneyAvailable(target) /
						(ns.getServerMaxMoney(target) / 100)
					var tPercent = 0
					if (networkMap.has(cmd)) {
						tPercent = network.state.get(cmd) / (networkMap.get(cmd) / 100)
					}

					var pTime = 0
					switch (cmd.split(' ')[0]) {
						case 'hack':
							pTime = ns.getHackTime(target) / 1000
							break

						case 'grow':
							pTime = ns.getGrowTime(target) / 1000
							break

						case 'weaken':
							pTime = ns.getWeakenTime(target) / 1000
							break

						default:
							pTime = 6
							break
					}

					tPrint += `---- Runtime: ${
						pTime / 60 > 0 ? Math.floor(pTime / 60) + 'min ' : ''
					}${Math.floor(pTime % 60)}sec\n`
					tPrint += `---- Volume : ${fullPercent.toFixed(3)}% -> ${ns.nFormat(
						ns.getServerMoneyAvailable(target),
						'$0a'
					)}\n`
					tPrint += `---- Prop   : ${(
						ns.hackAnalyzeChance(target) * 100
					).toFixed(3)}% \n`
					tPrint += `---- Gain   : ${ns.nFormat(
						Math.floor(0+gainMap.get(cmd)),
						'$ 0.000a'
					)} / sec \n`
				}
			}

			let pPrint = ''
			for (let [jID, threads] of jobMap) {
				pPrint += `+ [${jID}] @ ${ns.nFormat(threads, '000a')} thread(s)\n`
			}

			let cFlags = cc.flags.get('HackAll') ? ' --HACK-ALL' : ''
			cFlags += cc.flags.get('RunOnce') ? ' --ONCE' : ''
			cFlags += cc.flags.get('NoHnet') ? '--NO-HNET ' : ''
			cFlags += cc.flags.get('Share') > 0 ? ' --SHARE ' + cc.flags.get('Share') : ''
			cFlags += cc.flags.get('Charge') > 0? ' --CHARGE ' + cc.flags.get('Charge') : ''

			var out =
				`
---------------------------------------------------------
Network
${tPrint}-> 'run cc.js${cFlags}' computing ${ns.nFormat(
					totalThreads,
					'0a'
				)} thread(s) on ${totalCores} core(s) across ${running} node(s) with ${(
					networkRam /
					(network.totalRAM / 100)
				).toFixed(3)}% efficiency.

Economy
+ Money/sec	: ${ns.nFormat(ns.getScriptIncome(), '$0.000a')}
+ EXP/sec	: ${formatMoney(Math.floor(ns.getScriptExpGain()))}
+ Share		: ${ns.getSharePower()}

Fragments
+ Slots		: [${fragments.used.join('] [')}]
${fragments.used.map(root => {
	let frag = ns.stanek.getFragment(root[0], root[1])

	// Skip booster frags
	if ( frag.id >= 100 ) return ''

	return '--- ' + GAME_FRAGMENTS[frag.id] + ' @ ' + ns.nFormat(frag.numCharge, '0.000a')
}).filter(v => v.length > 0).join('\n')}
` +
				/*
				
				Hosts
				+ Owned		: ${running} / ${hostMap.length}
				+ BD		: ${bd} / ${running - priv}
				+ RAM		: ${hUsedRAM} / ${hAvailRAM} GB
				
				Servers		: ${priv} / ${ns.getPurchasedServerLimit()}
				+ RAM		: ${pUsedRAM} / ${pAvailRAM} GB
				
				Player
				+ Share		: ${ns.getSharePower()}
				*/
				`
---------------------------------------------------------`

			ns.tprint(out)
}
function act_list(ns) {
	ns.tprint(
		`Collecting info from ${hostMap.hosts.length} distinct hosts...`
	)

	var out2 = '-- [Hitlist] --\n'

	var rows = []
	network.targets.forEach((max, host, map) => {
		var avail = Math.floor(ns.getServerMoneyAvailable(host))

		rows.push([
			host,
			(avail / (max / 100)).toFixed(3) + ' %',
			formatMoney(avail) + ' $',
			formatMoney(max) + ' $',
			ns.getServerSecurityLevel(host).toFixed(3) + ' / ' + ns.getServerMinSecurityLevel(host),
			(ns.hackAnalyzeChance(host) * 100).toFixed(3) + ' %'
		])
	})

	out2 += formatTable(
		18,
		['Host', 'Volume', 'Available', 'Max', 'Security', 'Hack Chance'],
		rows
	)

	out2 += `\n\n`

	out2 += `-- [Network] --\n`

	var dRows = []
	network.nodes.forEach((host) => {
		dRows.push([
			host,
			ns.getServerUsedRam(host) + ' GB',
			ns.getServerMaxRam(host) + ' GB',
			hostMap.servers[host].cpuCores
		])
	})

	out2 += formatTable(18, ['Host', 'Used', 'Avail', 'Cores'], dRows)
	
	ns.alert(out2)
}
function act_plan(ns) {
	let taskMap = new Map()
			for ( let host of network.nodes ) {
				// Fetch all running workers for this host.
				ns.ps(host).forEach( proc => {
					if (
						proc.args.length >= 3 &&
						['/worker/hack.js', '/worker/grow.js', '/worker/weaken.js'].includes(proc.filename)
					) {
						let key = proc.filename.substring(8, proc.filename.length - 3),
							target = proc.args[1]
						
						if (!taskMap.has(target) ) taskMap.set(target, new Map())

						taskMap.get(target).set(key, (taskMap.get(target).has(key) ? taskMap.get(target).get(key) : 0) + proc.threads)
					}
				})
			}

			let taskPrint = ''
			for( let tTarget of Array.from(taskMap.keys()) ) {
				taskPrint += ` + ${tTarget}\n`

				for( let task of Array.from(taskMap.get(tTarget).keys())) {
					taskPrint += ` ---> ${task} @ ${taskMap.get(tTarget).get(task)} thread(s)\n`
				}
			}

			if ( ns.args.length <= 1 ) {
				ns.tprint(`
--- PLAN ---
${taskPrint}
------------`)
			} else {
				ns.alert(`--- PLAN ---
[Network]
${formatPipe(plan.network, '', taskMap)}`)
			}
			break

		case 'fragments':
			var tPrint = ''

			for (let [root, frag] of fragments.state) {
				tPrint += `+ [X.${frag.x}, Y.${frag.y}, R.${frag.rotation}]\n`
				tPrint += `--- Desc: ${frag.id < 100 ? GAME_FRAGMENTS[frag.id] : 'Booster'}\n`
				tPrint += `--- Chrg: ${frag.numCharge}\n`
			}

			ns.tprint(`
-- Fragments --
${tPrint}`)
}
function act_memory(ns) {
	let totalFree = 0
	for( let [host, free] of network.free ) {
		totalFree += free
	}

			let totalUsed = 0,
				hostUsed = new Map()
			for( let [jid, used, host] of network.state.get('__taken') ) {
				totalUsed += used
				hostUsed.set(host, (hostUsed.has(host) ? hostUsed.get(host) : 0) + used)
			}

			let totalOverhang = 0,
				hostOverhang = new Map()
			for( let host of network.nodes ) {
				let overhang = hostMap.servers[host].maxRam - hostMap.servers[host].ramUsed

				if (overhang > 0 && overhang < MIN_WORKER_RAM) {
					totalOverhang += overhang
					hostOverhang.set(host, overhang)
				}
			}

			// ToDo: can fill host with multiple scripts, not just min_worker_ram
			let avoidableOverhang = Array.from(hostOverhang.keys()).filter(host => hostMap.servers[host].maxRam % MIN_WORKER_RAM == 0)

			ns.tprint(`
-- [Memory] --

Free:       ${totalFree >= 0 ? ns.nFormat(totalFree, '0,000.00')+' GB' : 'NaN'}
In Use:     ${totalUsed >= 0 ? ns.nFormat(totalUsed, '0,000.00')+' GB' : 'NaN'}
Overhang:   ${totalOverhang >= 0 ? ns.nFormat(totalOverhang, '0,000.00')+' GB' : 'NaN'} across ${hostOverhang.size} host(s) ${avoidableOverhang.length} avoidable
			`)
}
function act_traceroute(ns) {
	if (ns.args.length < 2) {
		ns.tprint('Missing host argument')
		ns.exit()
	}

	let origin = 'home'
	let destination =  ns.args[1]

	if (ns.args.length == 3) {
		origin = ns.args[1]
		destination = ns.args[2]
	}

	let path = Array.from(...HostMap.load().path(origin, destination))

	path.splice(0, 1)

	ns.tprint(`
-- [Traceroute] --

Found route from [${origin}] to [${destination}] in ${path.length} hops.

-> ${path.map(v => 'connect ' + v).join(' ; ')}
	`)

}
function act_tracker(ns) {
	let tOut = ''
			switch (ns.args[1]) {

				case 'scripts':
					tOut += formatBarGraph(
						ns,
						tracker.scripts.map((val) => {
							return [val[0], val[1][ns.args[2] == 'avg' ? 1 : 0]]
						}),
						{
							title: 'Script Yield',
							xResolution: 110
						}
					)
					break

				case 'hacknet':
					tOut += formatBarGraph(
						ns,
						tracker.hnet,
						{
							title: 'Hacknet Production',
							xResolution: 110
						}
					)
					break

				default:
					tOut += 'Missing argument: run cmd.js tracker [name]'
					break
			}
			
			ns.tprint(tOut)
}
function act_hostmap(ns) {
	let root = 'home'
			if (ns.args.length > 1) {
				root = ns.args[1]
			}

			ns.tprint(`
-- Host Map --
${formatNodeMap(graphify(hostMap.neighbours), root)}
			`)
}
function act_env(ns) {
	if (ns.args.length < 2) {
		ns.tprint(`
--- Environment ---
+ Flags: 
${Object.entries(cc.flags).map(e => ` ${e[0]}: ${e[1]}`).join('\n')}
-------------------
		`)
	} else {
		cc.debug[ns.args[1]] = !cc.debug[ns.args[1]]

	CC.save(cc)
	}
}
function act_pattern(ns) {
	let stanek = 1;

			if (ns.args.length < 2) {
				ns.tprint('Usage: run cmd.js pattern [(in|out)|ls|convert] [(file)]')
				ns.exit()
			}

			if (ns.args[1] == 'in') {

				if ( !ns.fileExists( `/data/patterns/${ns.args[2]}.txt` ) ) {
					ns.tprint('Error: file not found: ', `/data/patterns/${ns.args[2]}.txt` )
					ns.exit()
				}

				// Load target state from disk
				let state = JSON.parse(await ns.read( `/data/patterns/${ns.args[2]}.txt` ))

				// Reset fragment tiles
				await ns.stanek.clearGift()

				// Place taget state tiles one by one
				for ( let frag of state ) {
					await ns.stanek.placeFragment( frag.x, frag.y, frag.rotation, frag.id )
				}
				
				// Remove fragments from network task list
				plan.network.removeByUID(plan.network.get('Charge'))
				plan.save()

			} else if (ns.args[1] == 'out') {

				// Write current Stanek's Gift tiles to file
				await ns.write( ns.args[2], JSON.stringify(Array.from(fragments.state.values())) )
				ns.tprint('Current stanek pattern written to file: ', ns.args[2])
			} else if (ns.args[1] == 'convert') {
				if ( !ns.fileExists(ns.args[2]) ) {
					ns.tprint('Error: file not found.')
					ns.exit()
				}
				if (ns.args.length < 4) {
					ns.tprint('Usage: run cmd.js pattern convert [file] [new-name]')
				}
				if ( ns.fileExists(`/data/patterns/${ns.args[3]}.txt`) ) {
					ns.tprint('Error: a pattern with that name exists already.')
					ns.exit()
				}

				// Parse JSON file content to js object
				let state = loadRestore(await ns.read( ns.args[2] ))

				await ns.write( `${ns.args[3]}.txt`, JSON.stringify( Array.from(state.values()) ), 'w' )

				ns.mv( cc.host, `${ns.args[3]}.txt`, `/data/patterns/${ns.args[3]}.txt` )
			} else if (ns.args[1] == 'ls') {
				ns.tprint(`
-- Patterns --
${ns.ls(cc.host, '/data/patterns/').map(
	p => p.split('/').pop().replace('.txt', '')
).join('\n')}
--------------`)
	
			}

			CC.save(cc)
}
function act_files(ns) {
	let files = new Map()
			let exclude = ['js', 'exe']

			for ( let host of hostMap.hosts ) {
				for ( let file of ns.ls(host) ) {
					
					let found = false
					for ( let srch of exclude ) {
						if (file.endsWith(`.${srch}`)) {
							found = true
							break
						}
					}
					if (found) continue

					!files.has(file) && files.set(file, [])

					files.get(file).push(host)
				}
			}

			ns.alert(`--- FILE LIST ---
${Array.from(files.keys()).map(k => `${k}: ${files.get(k).length > 3 ? files.get(k).length : files.get(k).join(' , ')}`).join('\n')}
			`)
}
function act_contract(ns) {
	if (ns.args.length != 3) {
		ns.tprint('Usage: run cmd.js contract [host] [file]')
		ns.exit()
	}
/*
	ns.tprint(`
--- Contract ---
Host : ${ns.args[1]}
Type : ${ns.codingcontract.getContractType(ns.args[2], ns.args[1])}
Tries: ${ns.codingcontract.getNumTriesRemaining(ns.args[2], ns.args[1])}
Desc : 
${ns.codingcontract.getDescription(ns.args[2], ns.args[1])}

Data : 
${ns.codingcontract.getData(ns.args[2], ns.args[1])}\n`)
*/
}
function act_ramlist(ns) {
	// Determine correct hostname, default to script host.
	let hostname = ns.getHostname()
	if ( ns.args > 1 ) {
		hostname = ns.args[1]
	}

	// Prepare result
	let costRows = []

	// Loop trough all files on host
	for ( let file of ns.ls(hostname) ) {

		// Skip non-script files
		if ( !file.includes('.js') ) continue

		// Add script files with RAM cost
		costRows.push([file, "" + ns.getScriptRam(file, hostname)])
	}

	// Sort by cost asc
	costRows.sort((a, b) => b[1] - a[1])

	ns.alert(`
	-- File List --
	${formatTable(25, ['Filename', 'Cost (GB)'], costRows)}
	`)
}