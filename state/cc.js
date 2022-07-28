import { OWN_SERVER_START_GB } from 'core/globals'
import { StorageEntry } from 'core/storage-entry'
import { isNumeric } from 'core/util'

export const DefaultFlags = {
	Silent: false,
	RunOnce: false,
	HackAll: false,
	KillAll: false,
	Share: false,
	Charge: false,
	NoHnet: false,
	DebugTick: false,
	ShareAmount: 0,
	ChargeAmount: 0
}
export class CC extends StorageEntry {
	static storageKey = 'State.CC'
	static storageValue = CC

	host = 'home'
	buffer = 20
	nodeStep = OWN_SERVER_START_GB
	sourceFiles = []

	deleteServers = []
	addServers = []

	/**
	 * List of sorted ns.hacknet.getNodeStats
	 * 
	 * @param Array
	 */
	hnet = []

	/**
	 * Save RAM cost per script name to avoid calls to ns.getScriptRAM().
	 * 
	 * @param Map
	 */
	scripts = new Map()

	/**
	 * cc.js process flags
	 */
	flags = DefaultFlags

	constructor() {
		super()
	}

	parseFlags(ns) {
		// Reset instance flags
		this.flags = DefaultFlags

		for (var f = 0; f < ns.args.length; f++) {
			switch (ns.args[f]) {
				case 'once':
					this.flags.RunOnce = true
					break

				case 'hackall':
					this.flags.HackAll = true
					break

				case 'killall':
						this.flags.KillAll = true
						break

				case 'nohnet':
					this.flags.NoHnet = true
					break

				case 'silent':
					this.flags.Silent = true
					break
				
				case 'debugtick':
						this.flags.DebugTick = true
						break

				case 'share':
					this.flags.Share = true
					this.flags.ShareAmount = ns.args[f + 1]
					f++
					break

				case 'charge':
					this.flags.Charge = true
					this.flags.ChargeAmount = ns.args[f + 1]
					f++
					break

				default:
					ns.tprint('Unrecognized flag: ' + ns.args[f])
					ns.exit()
					break
			}
		}

		// Parse CLI Flags
		if (
			(this.flags.Share &&
				(!this.flags.ShareAmount || !isNumeric(this.flags.ShareAmount))) ||
			(this.flags.Charge &&
				(!this.flags.ChargeAmount || !isNumeric(this.flags.ChargeAmount)))
		) {
			ns.tprint('Error: flag requires an additional argument.')
			ns.exit()
		}
		if (
			(this.flags.Share &&
				(this.flags.ShareAmount > 1 || this.flags.ShareAmount < 0)) ||
			(this.flags.Charge &&
				(this.flags.ChargeAmount > 1 || this.flags.ChargeAmount < 0))
		) {
			ns.tprint('Error: flag argument needs to be between 0 and 1.')
			ns.exit()
		}
	}

	notifyUpstart(ns, hostMap) {
		ns.toast(
			`[CC@${this.host}] Start with
	${this.flags.KillAll ? '--KILL-ALL ' : ''}
	${this.flags.RunOnce ? '--ONCE ' : ''}
	${this.flags.HackAll ? '--HACK-ALL ' : ''}
	${this.flags.NoHnet ? '--NO-HNET ' : ''}
	${this.flags.Silent ? '--SILENT ' : ''}
	${this.flags.DebugTick ? '--DEBUG-TICK ' : ''}
	${this.flags.Share ? '--SHARE ' + this.flags.ShareAmount : ''}
	${this.flags.Charge ? '--CHARGE ' + this.flags.ChargeAmount : ''}
	at ${this.nodeStep} GB node step on ${hostMap.hosts.length} visible hosts.`,
			'warning',
			10 * 1000
		)
	}

	notifyShutdown(ns) {
		ns.toast(
			`[CC@${this.host}] Shutdown`,
			'warning',
			10 * 1000
		)
	}

	/** @param {NS} ns */
	updateRamBuffer(ns) {
		this.buffer = 0

		ns.ls(this.host, 'task/').forEach((file) => {
			const cost = ns.getScriptRam(file, this.host)

			if (cost > this.buffer) this.buffer = cost
		})

		ns.ls(this.host, 'w_').forEach((file) => {
			const cost = ns.getScriptRam(file, this.host)

			this.scripts.set( file, cost )
		})
	}

	updateNodestep(ns, hostMap) {
		// Check for existing private nodes
		if (hostMap.purchased.length > 0) {
			// Loop trough entries and check if we need to raise initial buy threshold
			hostMap.purchased.forEach((host) => {
				if (this.nodeStep < ns.getServerMaxRam(host))
					this.nodeStep = ns.getServerMaxRam(host)
			})
		}
	}

	sourceFileLvl(num) {
		for ( let file of this.sourceFiles ) {

			if (file.n == num) return file.lvl
		}

		return 0
	}
}