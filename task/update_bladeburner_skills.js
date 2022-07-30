import { Bladeburner } from 'state/index'

let bb

export async function main(ns) {
	bb = Bladeburner.load()

  let skills = {}
  for ( let skillName of ns.bladeburner.getSkillNames() ) {
    skills[skillName] = {
      level: ns.bladeburner.getSkillLevel(skillName),
      cost: ns.bladeburner.getSkillUpgradeCost(skillName)
    }
  }

  bb.skills = skills

  Bladeburner.save(bb)
}