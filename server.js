const BasePath = location.protocol + '//' + location.host + location.pathname;
let connections = {}
let used = {}
let dictionaryBackup = {}
let dictionary = {}
let played = {}
state = { players: {}, queue: {}, started: false, game: {}, settings: {
	seconds: DEFAULT_SECONDS,
	alphabet: DEFAULT_ALPHABET,
	lives: DEFAULT_LIVES,
	anyone_can_start: DEFAULT_ANYONE_CAN_START
} }

function update(label, type, data) {
  switch (type) {
    case MessageType.Rename:
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
      if (dictionary[data] && !played[data] && data.includes(state.game.query)) {
        delete dictionary[data]
        for (const letter of data) {
          if (letter in state.game.letters[label]) {
            state.game.letters[label][letter] = Math.max(0, state.game.letters[label][letter] - 1)
          }
        }
        if (Object.values(state.game.letters[label]).every(v => v == 0)) {
		  if(Object.keys(state.game.letters[label]).length != 0){
			state.game.lives[label] += 1
		  }
          state.game.letters[label] = alphabetSet();
        }

        played[data] = true
        state.game.lastSolve[label] = data
        state.game.turn = (state.game.turn + 1) % state.game.order.length
        startTurn()
      }
      break
    case MessageType.StartGameRequest:
      if (state.started) { return }
      state.started = true
      dictionary = { ...dictionaryBackup }
      played = {}
      let order = Object.keys(state.queue)
      state.game = {
        typed: '',
        order: order,
        turn: 0,
        query: getQuery(),
        deadline: deadline(),
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
		case 'custom_dictionary_input': 
			loadDictionary(await elem.files.item(0).text())
		break
		default: console.log('Error updating:', elem)
	}
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
  let words = Object.keys(dictionary)
  word = words[(Math.random() * words.length) | 0] | ''
  let count = 2
  if (Math.random() > 0.5) {
    count += 1
  }
  let idx = (Math.random() * (word.length - count + 1)) | 0
  debug(word)
  return word.slice(idx, idx + count)
}

let language = new URLSearchParams(window.location.search).get('language');
language = ['english', 'french', 'both'].includes(language) ? language : 'english'

fetch(`${BasePath}dictionaries/${language}.txt`).then(response => response.text()).then(text => {
  loadDictionary(text)
  dictionaryBackup.keys().filter((key) => key.length <= 2).forEach((key) => {
    delete dictionaryBackup[key]
  })
})

function loadDictionary(text) {
	dictionaryBackup = new Set(text.split(/\s+/));
}