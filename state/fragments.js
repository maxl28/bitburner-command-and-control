import { StorageEntry } from 'core/storage-entry'


export class Fragments extends StorageEntry {
	static storageKey = 'State.Fragments'
	static storageValue = Fragments

	used = []

	/**
	 * @param {Map} state
	 */
	state = new Map()

	constructor() {
		super()
	}
}