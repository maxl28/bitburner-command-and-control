import { fetchOrCreateObject, save } from 'core/orm'

/** @param {NS} ns **/
export class StorageEntry {

	static storageKey		= '__storageEntry'
	static storageValue		= StorageEntry

	static load() {
		try {
			return fetchOrCreateObject(this.storageKey, this.storageValue)
		} catch (e) {
			ns.tprint('ERROR: failed to load StorageObject by key -> ', this.storageKey)
		}
	}

	static save(data = this) {

		save(this.storageKey, data)
	}
}