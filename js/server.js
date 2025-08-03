const BasePath = location.protocol + '//' + location.host + location.pathname.replaceAll(/index\.html/g, '');
let connections = {}
let used = {}
let dictionarySet = new Set()
let dictionary = []
let dictionary_index = 0
let frequency = null
let played = {}
let syllables = null

state = {
	players: {}, queue: {}, started: false, game: {}, settings: {
		seconds: DEFAULT_SECONDS,
		alphabet: DEFAULT_ALPHABET,
		lives: DEFAULT_LIVES,
		anyone_can_start: DEFAULT_ANYONE_CAN_START,
		minrarity: DEFAULT_MINRARITY,
		maxrarity: DEFAULT_MAXRARITY,
	}
}

function update(label, type, data) {
	switch (type) {
		case MessageType.Rename:
			if (!data.name) { return }
			new_name = data.name?.substring(0, 20)
			if (Object.values(state.players).includes(new_name)) { return }
			state.players[label] = new_name
			break
		case MessageType.EnterGame:
			if (state.queue[label]) { return }
			state.queue[label] = true
			break
		case MessageType.LeaveGame:
			if (!state.queue[label]) { return }
			removePlayerFromGame(label)
			break
		case MessageType.Typed:
			if (!state.started || state.game.order[state.game.turn] != label) { return }
			state.game.typed = data
			break
		case MessageType.Submit:
			if (!state.started || state.game.order[state.game.turn] != label) { return }
			data = data.trim().toLowerCase()
			if (dictionarySet.has(data) && !played[data] && data.includes(state.game.query)) {
				for (const letter of data) {
					if (letter in state.game.letters[label]) {
						state.game.letters[label][letter] = Math.max(0, state.game.letters[label][letter] - 1)
					}
				}
				if (Object.values(state.game.letters[label]).every(v => v == 0)) {
					if (Object.keys(state.game.letters[label]).length != 0) {
						state.game.lives[label] += 1
					}
					state.game.letters[label] = alphabetSet();
				}

				played[data] = true
				state.game.lastSolve[label] = data
				state.game.turn = (state.game.turn + 1) % state.game.order.length
				startTurn()
			} else {
				state.game.wrongCount += 1;
			}
			break
		case MessageType.StartGameRequest:
			if (state.started || (!state.settings.anyone_can_start && label != 'host')) { return }
			state.started = true
			selectWords()
			played = {}
			let order = Object.keys(state.queue)
			state.game = {
				typed: '',
				order: order,
				turn: 0,
				query: getQuery(),
				deadline: deadline(),
				wrongCount: 0,
				lives: Object.fromEntries(order.map((id) => [id, state.settings.lives])),
				letters: Object.fromEntries(order.map((id) => [id, alphabetSet()])),
				lastSolve: Object.fromEntries(order.map((id) => [id, '']))
			}
			break
		default:
			console.log(['NOT FOUND', label, type, data])
			return
	}
	sendStateUpdate()
}

async function update_settings(elem) {
	elem = document.getElementById(elem.id)
	switch (elem.id) {
		case 'anyone_can_start_input':
			state.settings.anyone_can_start = elem.checked
			sendStateUpdate()
			break
		case 'seconds_input':
			state.settings.seconds = Number(elem.value)
			break
		case 'lives_input':
			state.settings.lives = Number(elem.value)
			break
		case 'alphabet_input':
			state.settings.alphabet = elem.value
			break
		case 'minrarity_input':
			state.settings.minrarity = Math.min(
				99,
				Math.max(0, Number(elem.value) || DEFAULT_MINRARITY)
			)
			state.settings.maxrarity = Math.max(
				state.settings.maxrarity,
				state.settings.minrarity + 1,
			)
			break
		case 'maxrarity_input':
			state.settings.maxrarity = Math.max(
				10,
				Math.min(100, Number(elem.value) || DEFAULT_MAXRARITY)
			)
			state.settings.minrarity = Math.min(
				state.settings.minrarity,
				state.settings.maxrarity - 1,
			)
			break
		case 'custom_dictionary_input':
			return loadDictionary(await elem.files.item(0).text())
			break
		default: console.log('Error updating:', elem)
	}
	insertSettings()
}


function removePlayer(label) {
	if (label in connections) {
		delete connections[label]
		delete state.players[label]
		delete state.queue[label]
		removePlayerFromGame(label)
		sendStateUpdate()
	}
}

function startTurn() {
	state.game.typed = ''
	state.game.query = getQuery()
	state.game.deadline = deadline()
}

function deadline() {
	let d = (state.settings.seconds * 1000)
	deadlineTimeout(d + 500)
	return Date.now() + d
}

function alphabetSet() {
	let alphabet = {}
	for (const letter of state.settings.alphabet) {
		alphabet[letter] = (alphabet[letter] || 0) + 1
	}
	return alphabet
}


let lastDeadlineID;
function deadlineTimeout(delay) {
	if (lastDeadlineID) { clearTimeout(lastDeadlineID); }
	lastDeadlineID = setTimeout(() => {
		if (state.started && state.game?.deadline && (state.game.deadline < Date.now())) {
			let deadline_label = state.game.order[state.game.turn]
			state.game.lastSolve[deadline_label] = String.fromCodePoint(55357) + String.fromCodePoint(56468) + `(${word})`
			state.game.lives[deadline_label] -= 1
			if (state.game.lives[deadline_label] < 1) {
				removePlayerFromGame(deadline_label)
			} else {
				state.game.turn = (state.game.turn + 1) % state.game.order.length
			}
			startTurn()
			sendStateUpdate()
		}
	}, delay);
}


function removePlayerFromGame(label) {
	delete state.queue[label]
	if (!(state.started && state.game.order.includes(label))) { return }
	if (state.game.order.length == 1) {
		state.game = {}
		state.started = false
		return
	}
	let idx = state.game.order.indexOf(label)
	if (state.game.turn == idx) {
		startTurn()
	} else if (state.game.turn > idx) {
		state.game.turn -= 1
	}
	state.game.order.splice(idx, 1)
	state.game.turn = state.game.turn % state.game.order.length

	delete state.game.lives[label]
	delete state.game.letters[label]
}

let word = ''
function getQuery() {
	for (let i = 0; i < 100; i++) {
		word = dictionary[(dictionary_index++) % dictionary.length]
		if (!played[word] || word.length < 2) {
			break;
		}
	}
	
	if (syllables) {
		let options = []
		for (let i = 0; i < word.length - 2; i++) {
			if (syllables.has(word.slice(i, i + 3))) {
				options.push(word.slice(i, i + 3));
			}
		}
		for (let i = 0; i < word.length - 1; i++) {
			if (syllables.has(word.slice(i, i + 2))) {
				options.push(word.slice(i, i + 2));
			}
		}
		debug('Choose word:',word, '; syllable options:', options)
		return options[Math.floor(Math.random() * options.length)]
	} else {
		let count = 2
		if (word.length > 2 && Math.random() > 0.5) {
			count += 1
		}
		let idx = (Math.random() * (word.length - count + 1)) | 0
		return word.slice(idx, idx + count)
	}
}

let language = new URLSearchParams(window.location.search).get('language');
language = ['english', 'french'].includes(language) ? language : 'english'

fetch(`${BasePath}dictionaries/${language}.txt`).then(response => response.text()).then(dict => {
	fetch(`${BasePath}dictionaries/${language}.freq.json`).then(response => response.json()).then(freq => {
		loadDictionary(dict, freq)
	})
})

function loadDictionary(dict, freq) {
	dictionarySet = new Set(dict.split(/\s+/))
	frequency = freq
}

function selectWords() {
	dictionary = [...dictionarySet]
	syllables = null;
	if (!frequency) {
		frequency = calculateFrequency(dictionary)
	}
	let query_count = 0
	for (const am of frequency) {
		query_count += am[1].length * Math.ceil(Math.log2(am[0]))
	}

	min_skip = Math.ceil(((100 - state.settings.minrarity) * query_count) / 100.0)
	max_skip = Math.ceil(((100 - state.settings.maxrarity) * query_count) / 100.0)
	syllables = new Set()
	outer: for (const group of frequency) {
		let log_freq = Math.ceil(Math.log2(group[0]));
		for (const elem of group[1]) {
			max_skip -= log_freq
			min_skip -= log_freq
			if (max_skip <= 0) {
				if(syllables.size == 0) {
					debug('Rarest syllable frequency included:', group)
				}
				if (min_skip >= 0 || syllables.size == 0) {
					syllables.add(elem)
				} else {
					debug('Most common syllable frequency excluded:', group)
					break outer;
				}
			}
		}
	}
	dictionary = dictionary.filter((word) => {
		for (let i = 0; i < word.length - 2; i++) {
			if (syllables.has(word.slice(i, i + 3))) {
				return true;
			}
		}
		for (let i = 0; i < word.length - 1; i++) {
			if (syllables.has(word.slice(i, i + 2))) {
				return true;
			}
		}
		return false;
	})

	dictionary.sort(() => Math.random() - 0.5);
}

function calculateFrequency(dictionary){
	let data = {}
	for(const word of dictionary){
		let syllables = new Set()
		for(let i = 0; i < word.length - 2; i++){
			syllables.add(word.slice(i, i+3))
		}
		for(let i = 0; i < word.length - 1; i++){
			syllables.add(word.slice(i, i+2))
		}
		for(const syllable of [...syllables]){
			data[syllable] = (data[syllable] || 0) + 1
		}
	}
	let freq = {}
	for (const [key, value] of Object.entries(data)) {
		freq[value] = (freq[value] || [])
		freq[value].push(key) 
	}
	return Object.entries(freq).map((e) => [Number(e[0]), e[1]])
}

{
	let script = document.createElement('script');
	script.src = 'js/host.js';
	document.head.append(script)
}