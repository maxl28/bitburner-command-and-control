import { Plan } from 'state/index'

/** @param {NS} ns **/
export async function main(ns) {
  let plan = Plan.load()

  ns.tprint(plan)
}