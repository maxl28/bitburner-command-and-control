/////////////////////////////
///////// 	DEBUG		/////////
/////////////////////////////
export const DEBUG_TICK = false
export const DEBUG_RUN = false
export const DEBUG_DISPATCH = false


/////////////////////////////
///////	  TECHNICAL		///////
/////////////////////////////

/** Maximum execution time of a child script. Used in asyncRun() */
export const MAX_SCRIPT_RUNTIME = 4 * 1000
export const CC_CYCLE_PAUSE = .075 * 1000
export const CC_BIG_TICK_COUNT = 300
export const CC_PLAN_UPDATE_TICK_COUNT = 2
export const WORKER_SCRIPTS = ['w_share.js', 'w_hack.js', 'w_grow.js', 'w_weaken.js', 'w_charge.js']
export const KILL_SCRIPTS = ['w_share.js', 'w_charge.js']
export const GAME_PROGRAMS = [
	['BruteSSH.exe', .5 * 1000000],
	['FTPCrack.exe', 1.5 * 1000000],
	['relaySMTP.exe', 5 * 1000000],
	['HTTPWorm.exe', 30 * 1000000],
	['SQLInject.exe', 250 * 1000000]
]



/////////////////////////////
///////	  GAMEPLAY		///////
/////////////////////////////
export const OWN_SERVER_START_GB = 64
export const OWN_SERVER_MAX_GB = 65536
export const OWN_SERVER_PREFIX = "p-node"
export const OWN_SERVER_IMPROVEMENT = .20
export const OWN_SERVER_BUY_CORPUS = .75

export const MIN_WORKER_RAM = 1.65
export const HNET_BUY_CORPUS = .65
export const FARM_THRESHOLD_HACK_CHANCE = .45
export const FARM_MIN_VOLUME = .3
export const FARM_MAX_VOLUME = .9
export const FARM_MIN_TARGETS = 2
export const FARM_TARGET_PERCENTAGE = 1

export const STOCK_COMISSION_FEE = 100000