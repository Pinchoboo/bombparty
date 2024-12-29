let peer = new Peer();
let connections = {}
let used = {}
let dictionaryBackup = {}
let dictionary = {}
let played = {}
let state = {players: {}, queue: {}, started: false, game: {}}

const BasePath = location.protocol + '//' + location.host + location.pathname;

function handleData(conn, type, data) {
  if(type != MessageType.ClientHello && !(conn.label in connections)) {return} 

  switch(type) {
    case MessageType.ClientHello:
      if(conn.label in connections) { return conn.close() } 
      connections[conn.label] = conn
      state.players[conn.label] = data.name
     break
    case MessageType.Rename:
      if(Object.values(state.players).includes(data.name)) { return }
      state.players[conn.label] = data.name
      break
    case MessageType.EnterGame:
      if(state.queue[conn.label]) { return }
      state.queue[conn.label] = true
     break
    case MessageType.LeaveGame:
      if(!state.queue[conn.label]) { return }
      removePlayerFromGame(conn.label)
     break
    case MessageType.Typed:
      if(!state.started || state.game.order[state.game.turn] != conn.label) { return }
      state.game.typed = data
     break
    case MessageType.Submit:
      if(!state.started || state.game.order[state.game.turn] != conn.label) { return }
      data = data.trim().toLowerCase()
      if(dictionary[data] && !played[data] && data.includes(state.game.query)){
        delete dictionary[data]
        played[data] = true
        state.game.lastSolve[conn.label] = data
        state.game.turn = (state.game.turn+1) % state.game.order.length
        state.game.query = getQuery() 
      }
      state.game.typed = ''
     break
    case MessageType.StartGameRequest:
      if(state.started) { return }
      state.started = true
      dictionary = {...dictionaryBackup}
      played = {}
      let order = Object.keys(state.queue)
      state.game = {
        typed: '', 
        order: order, 
        turn: 0,
        query: getQuery(), 
        lives: Object.fromEntries(order.map((id) => [id, 3])),
        letters: Object.fromEntries(order.map((id) => [id, {}])),
        lastSolve: Object.fromEntries(order.map((id) => [id, '']))
      }
     break
    default:
      console.log(['NOT FOUND', conn, type, data])
      return
  }
  sendStateUpdate()
}

function sendStateUpdate() {
  for (const conn of Object.values(connections)) {
    conn.send(StateUpdate(state))
  }
}

function removePlayer(label) {
  if(label in connections) {
    delete connections[label]
    delete state.players[label]
    delete state.queue[label]
    removePlayerFromGame(label)
    sendStateUpdate()
  }
}

function removePlayerFromGame(label) {
  delete state.queue[label]
  if(!(state.started && state.game.order.includes(label))) { return }
  if(state.game.order.length == 1) {
    state.game = {}
    state.started = false
    return
  }
  let idx = state.game.order.indexOf(label)
  if(state.game.turn == idx ){
    state.game.typed = ''
    state.game.query = getQuery()
  }else if(state.game.turn > idx){ 
    state.game.turn -= 1
  }
  state.game.order.splice(idx, 1)
  state.game.turn = state.game.turn % state.game.order.length

  delete state.game.lives[label]
  delete state.game.letters[label]
}

function getQuery() {
  let words = Object.keys(dictionary)
  let word = words[(Math.random() * words.length) | 0]
  let count = 2
  if(Math.random() > 0.5) {
    count+=1
  }
  let idx = (Math.random() * (word.length - count + 1)) | 0
  console.log(word)
  return word.slice(idx, idx + count)
}

fetch(`${BasePath}/dictionaries/english.json`).then(response => response.json()).then(json => {
  dictionaryBackup = json
  Object.keys(dictionaryBackup).filter((key) => key.length <= 2).forEach((key) => {
    delete dictionaryBackup[key]
  })
})
peer.on('open', (id) => {
  // display join url
  let url = `${BasePath}/game.html?id=${id}`
  document.getElementById('id').innerHTML = `<a href=${url}>${url}</a>`
  
  peer.on('connection', function(conn) {
    conn.on('data', (data) => handleData(conn, data.type, data.data));
    conn.on('close', () => removePlayer(conn.label))
    conn.on('error', (err) => {console.log(err)})
  });

  peer.on('close', () => {peer.destroy()})
  peer.on('disconnected', () => {peer.reconnect()})
  peer.on('error', (err) => {console.log(err)})
})
