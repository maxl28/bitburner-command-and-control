import { CC } from 'state/index'
import { asyncRun } from 'core/run'

let cc

export async function main(ns) {
	cc = CC.load()
  
	// Try / Check Bladeburner status, exit on failure.
	if( !cc.player.inBladeburner || cc.sourceFileLvl(7) < 1 ) return

	ns.bladeburner.joinBladeburnerDivision()
	ns.bladeburner.joinBladeburnerFaction()

  // Update Bladeburner intel in stages as RAM consumption on these functions is pretty high
	await asyncRun(ns, 'task/update_bladeburner_actions.js')
	await asyncRun(ns, 'task/update_bladeburner_skills.js')
}