import { CC, Bladeburner } from 'state/index'
import { millisToHuman } from 'core/util'


const BB_MIN_HP = .2
const BB_BLACKOP_T_CHANCE = .93
const BB_MIN_RECRUITMENT_CHANCE = .6

let cc, bb

let actionTimer = 0
/**
 * 
 * @param {ns} NS 
 */
export async function main(ns) {
  while(true) {
    bb = Bladeburner.load()
    cc = CC.load()

    await updateAction(ns)
  }
}

async function updateAction(ns) {
  let curAct = ns.bladeburner.getCurrentAction(), changeAct = null
  const chance = ns.bladeburner.getActionEstimatedSuccessChance

  if (bb.blackOp != null) {
    let i = 0
    do { i++ }
    while ( ns.bladeburner.setTeamSize('Black Operations', bb.blackOp.name, i) > -1)
  }

  if (Date.now() > actionTimer || curAct == null) {
    if (cc.player.hp.current < cc.player.hp.max*BB_MIN_HP) {
      changeAct = {type:"General", name: "Hyperbolic Regeneration Chamber", times:3}
    } else if ( chance('General', 'Recruitment')[0] >= BB_MIN_RECRUITMENT_CHANCE ) {
      changeAct = {type:"General", name: "Recruitment", times:10}
    } else if ( bb.blackOp != null && chance('Black Operations', bb.blackOp.name)[0] >= BB_BLACKOP_T_CHANCE ) {
      changeAct = {type:"Black Operations", name: bb.blackOp.name, times:1}
    } else if ( bb.cities.hasOwnProperty(cc.player.city) && bb.cities[cc.player.city].chaos > 50 ) {
      changeAct = {type:"General", name: "Diplomacy", times:10}
    } else {
      changeAct = {type:"General", name: "Training", times:10}
    }
  }


  if (changeAct != null) {
    ns.bladeburner.startAction(changeAct.type, changeAct.name)
    const actDuration = (changeAct.times * ns.bladeburner.getActionTime(changeAct.type, changeAct.name))

    cc.notify(ns, 'warning', `Change Action: ${changeAct.type} > ${changeAct.name} for ${millisToHuman(actDuration)}`, 4*1000, 'daemon_BB')

    actionTimer = Date.now() + actDuration
    await ns.sleep(200 + actDuration)
  } else {
    await ns.bladeburner.nextUpdate()
  }
}