import { Bladeburner } from 'state/index'

let bb

export async function main(ns) {
	bb = Bladeburner.load()

  let actionHelper = (actionType, actionList) => {
    let actions = {}

    for ( let actionName of actionList ) {
      actions[actionName] = {
        type: actionType,

        level: ns.bladeburner.getActionCurrentLevel(actionType, actionName),
        levelMax: ns.bladeburner.getActionMaxLevel(actionType, actionName),

        repGain: ns.bladeburner.getActionRepGain(actionType, actionName),
        time: ns.bladeburner.getActionTime(actionType, actionName),

        chance: ns.bladeburner.getActionEstimatedSuccessChance(actionType, actionName),

        triesRemaining: ns.bladeburner.getActionCountRemaining(actionType, actionName),
      }
    }

    return actions
  }

  bb.actions = {
    ...actionHelper('general', ns.bladeburner.getGeneralActionNames()),
    ...actionHelper('contract', ns.bladeburner.getContractNames()),
    ...actionHelper('operation', ns.bladeburner.getOperationNames()),
    ...actionHelper('blackop', ns.bladeburner.getBlackOpNames()),
  }

  Bladeburner.save(bb)
}