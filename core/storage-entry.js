import { fetchOrCreateObject, save } from 'core/orm'

/** @param {NS} ns **/
export class StorageEntry {

	static storageKey		= '__storageEntry'
	static storageValue		= StorageEntry

	static load() {
		return fetchOrCreateObject(this.storageKey, this.storageValue)
	}

	static save(data = this) {

		save(this.storageKey, data)
	}
}