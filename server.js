const BasePath = location.protocol + '//' + location.host + location.pathname;
let connections = {}
let used = {}
let dictionaryBackup = {}
let dictionary = {}
let played = {}
state = { players: {}, queue: {}, started: false, game: {} }

function update(label, type, data) {
  switch (type) {
    case MessageType.Rename:
      new_name = data.name.splice.substring(0, 20)
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
        lives: Object.fromEntries(order.map((id) => [id, 3])),
        letters: Object.fromEntries(order.map((id) => [id, {}])),
        lastSolve: Object.fromEntries(order.map((id) => [id, '']))
      }
      break
    default:
      console.log(['NOT FOUND', label, type, data])
      return
  }
  sendStateUpdate()
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
  let d = (10 * 1000)
  deadlineTimeout(d + 500)
  return Date.now() + d
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
  word = words[(Math.random() * words.length) | 0]
  let count = 2
  if (Math.random() > 0.5) {
    count += 1
  }
  let idx = (Math.random() * (word.length - count + 1)) | 0
  console.log(word)
  return word.slice(idx, idx + count)
}

fetch(`${BasePath}dictionaries/english.json`).then(response => response.json()).then(json => {
  dictionaryBackup = json
  Object.keys(dictionaryBackup).filter((key) => key.length <= 2).forEach((key) => {
    delete dictionaryBackup[key]
  })
})
