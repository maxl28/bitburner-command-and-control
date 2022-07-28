import { StorageEntry } from 'core/storage-entry'
import { findPaths, graphify } from 'core/util'

export class HostMap extends StorageEntry {
	static storageKey = 'State.HostMap'
	static storageValue = HostMap

	/**
	 * @param {Map<String,String[]>} neighbours
	 */
	neighbours = new Map()

	purchased = []
	hosts = []

	servers = {}

	constructor() {
		super()
	}

	/**
	 * Find relatively short path in HostMap.nodes
	 * from {origin} to {destination}
	 *
	 * @param {origin} string
	 * @param {destination} string
	 *
	 * @returns []String
	 */
	path(origin, destination) {
		return findPaths(graphify(this.neighbours), origin, destination)
	}
}