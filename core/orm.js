/** @returns Object */
export function fetchOrCreateObject(key, obj, ...args) {

	// Try fetching our Object
	const storageEntry = localStorage.getItem(key)

	// Check if Map not created yet
	if (storageEntry === null) {

		// Return empty instance
		return new obj(...args)
	}

	// Parse back from JSON
	return Object.assign(new obj, loadRestore(storageEntry))
}

export function save(key, value) {
	localStorage.setItem(key, encodeRestore(value))
}

export function loadRestore(raw) {
  return JSON.parse(raw, reviver)
}

export function encodeRestore(raw) {
  return JSON.stringify(raw, replacer)
}


function replacer(key, value) {
  if(value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()), // or with spread: value: [...value]
    };
  } else {
    return value;
  }
}
function reviver(key, value) {
  if(typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
}