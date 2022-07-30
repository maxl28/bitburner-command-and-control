import { OWN_SERVER_START_GB } from 'core/globals'
import { StorageEntry } from 'core/storage-entry'
import { Flags } from 'core/flags'

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
	 * Save current intel from ns.getPlayer().
	 */
	player = {}

	/**
	 * cc.js process flags
	 */
	 flags = new Flags([
		[
			'silent', 
			false, 
			[
				'Hide any and all annoying ns.toast messages. Usefull if you left the game on',
				'idle for a few days.',
				'Also prevents the game from freezing or crashing from notification spam.'
			].join('\n')
		],
		[
			'run-once', 
			false,
			[
				'Only run CC for one tick and then shut down.'
			].join('\n')
		],
		[
			'hack-all',
			false,
			[
				'Overwrite semi intelligent plan creation and simply try to hack all feasable hosts.'
			].join('\n')
		],
		[
			'kill-all', 
			false,
			[
				'Kill any leftover running worker skipts. Usefull in combination the run-once flag.'
			].join('\n')
		],
		[
			'no-hnet',
			false,
			[
				'Disable automatic Hacknet upgrades every big tick (see globals.js).'
			].join('\n')
		],
		[
			'share',
			0.0,
			[
				'Configure how much of your total avaiable RAM should be dedicated to sharing.',
				'Use a percentage value between 0 and 1, eg. .35.'
			].join('\n')
		],
		[
			'charge',
			0.0,
			[
				'Configure how much of your total avaiable RAM should be dedicated to charging',
				'any available Stanek\'s Fragments, only available after SourceFile-11.',
				'Use a percentage value between 0 and 1, eg. .35.'
			].join('\n')
		],
	])

	constructor() {
		super()
	}

	parseFlags(ns) {

		// Reset instance flags
		this.flags.parse(ns)
		
		if ( ns.args.includes('help')) {
			ns.tprint('\n--- HELP ---\n\n' + this.flags.help())

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

		if ( this.player.bitNodeN == num ) return 1

		return 0
	}

	static load() {
		let cc = super.load()

		let fd = cc.flags
		
		cc.flags = new Flags(fd.__flagData)
		cc.flags.__props = fd.__props

		return cc
	}
}