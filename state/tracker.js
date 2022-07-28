import { StorageEntry } from 'core/storage-entry'

export class Tracker extends StorageEntry {
	static storageKey = 'State.Tracker'
	static storageValue = Tracker


	scripts = []
	hnet = []

	ccChanges = []

	constructor() {
		super()
	}
}