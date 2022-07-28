import { Fragments } from 'state/index'

/** @param {NS} ns **/
export async function main(ns) {

	let frags = new Fragments()
	
	frags.used = []
	frags.state = new Map()

	// Do we have the gift yet?
	if ( ns.stanek.acceptGift() ) {
	// Parse fragments currently in use
		ns.stanek.activeFragments().forEach(frag => {
			
			let root = [frag.x, frag.y]

			// Add fragment to list
			frags.used.push(root)
			frags.state.set(root, frag)
		})
	}

	Fragments.save(frags)
}