

export class Performance {

	startEntries = []
	doneEntries = []

	constructor() {}

	mark(label) {
		this.startEntries.push([label, Date.now()])
	}

	done(label) {
		this.doneEntries.push([label, Date.now()])
	}

	fetch() {
		let parsed = new Map()

		for ( let entry of this.startEntries ) {
			parsed.set(entry[0], [ entry[1] ])
		}
		for ( let entry of this.doneEntries ) {
			if ( parsed.has(entry[0]) ) parsed.get(entry[0]).push(entry[1])
		}

		let out = '-[ Performance Report ]-\n\n'
		for ( let [label, times] of parsed ) {
			out += `+ '${label}': ${times[1] - times[0]}ms\n`
		}
		out += 		'------------------------\n'

		return '\n' + out
	}
}