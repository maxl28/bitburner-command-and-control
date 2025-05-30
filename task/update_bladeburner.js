import { CC, Bladeburner } from 'state/index'

import { GAME_CITIES } from 'core/globals'

let cc, bb

export async function main(ns) {
	cc = CC.load()
	bb = Bladeburner.load()
  
	// Try / Check Bladeburner status, exit on failure.
	if( !cc.player.factions.includes('Bladeburners') ) {
		ns.bladeburner.joinBladeburnerDivision()
		ns.bladeburner.joinBladeburnerFaction()

		return
	}

	bb.blackOp = ns.bladeburner.getNextBlackOp()

	bb.skills = {}
  for ( let skillName of ns.bladeburner.getSkillNames() ) {
    bb.skills[skillName] = {
      level: ns.bladeburner.getSkillLevel(skillName),
      cost: ns.bladeburner.getSkillUpgradeCost(skillName)
    }
  }

	bb.cities = {}
	for ( let cityName of GAME_CITIES ) {
		bb.cities[cityName] = {
			chaos: ns.bladeburner.getCityChaos(cityName),
			communities: ns.bladeburner.getCityCommunities(cityName),
		}
	}


	Bladeburner.save(bb)
}