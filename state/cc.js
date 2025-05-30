import { OWN_SERVER_START_GB, CC_NOTIFY_LEVELS } from 'core/globals'
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
			'notify-level',
			CC_NOTIFY_LEVELS['info'],
			[
				'Set the level of notifications you want to receive.',
				'Useful to reduce notification spam when running CC in the background.',
				'Vals: ' + Object.entries(CC_NOTIFY_LEVELS).map(e => e[0]+':'+e[1]).join(', '),
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
		[
			'sf',
			'',
			[
				'A comma seperated list of source file numbers owned. Unfortunately, the original ',
				'data endpoint was removed from the game\'s API.',
				'Example: 1,5,13'
			]
		]
	])

	constructor() {
		super()
	}

	parseFlags(ns) {		
		if ( ns.args.includes('help')) {
			ns.tprint('\n--- HELP ---\n\n' + this.flags.help())

			ns.exit()
		}

		// Reset instance flags
		this.flags.parse(ns)
	}

	notifyUpstart(ns, hostMap) {
		this.notify(ns, 'info', `Start with
	${this.flags.KillAll ? '--KILL-ALL ' : ''}
	${this.flags.RunOnce ? '--ONCE ' : ''}
	${this.flags.HackAll ? '--HACK-ALL ' : ''}
	${this.flags.NoHnet ? '--NO-HNET ' : ''}
	${this.flags.Silent ? '--SILENT ' : ''}
	${this.flags.DebugTick ? '--DEBUG-TICK ' : ''}
	${this.flags.NotifyLevel ? '--NOTIFY-LEVEL ' + this.flags.NotifyLevel : ''}
	${this.flags.Share ? '--SHARE ' + this.flags.ShareAmount : ''}
	${this.flags.Charge ? '--CHARGE ' + this.flags.ChargeAmount : ''}
	at ${this.nodeStep} GB node step on ${hostMap.hosts.length} visible hosts.`,
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

		ns.ls(this.host, '/worker/').forEach((file) => {
			const cost = ns.getScriptRam(file, this.host)
			this.scripts.set( (file[0]=='/'?file:'/'+file), cost )
		})
	}

	notify(ns, level, msg, timeout = 10 * 1000, agent = 'CC') {
		let nLvl = this.flags.get('NotifyLevel')

		if (CC_NOTIFY_LEVELS[level] < nLvl) return 

		ns.toast(`[${agent}@${this.host}] ${msg}`, level, timeout)
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

	// Todo: Will always return lvl 1 if source-file is present, 0 otherwise.
	// 				Find a way to recover the 'real' source-file value.
	sourceFileLvl(num) {
		for ( let file of this.flags.get('Sf').split(',') ) {

			if (parseInt(file) == num) return 1
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