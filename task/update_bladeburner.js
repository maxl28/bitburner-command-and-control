import { CC } from 'state/index'

let cc

export async function main(ns) {
	cc = CC.load()

  // Try / Check Bladeburner status, exit on failure.
	if( !ns.bladeburner.joinBladeburnerDivision() ) return

  
}