const urlParams = new URLSearchParams(window.location.search);

const idSpan = document.getElementById('id')
const generalButtons = document.getElementById('general-buttons')
const playerList = document.getElementById('player-list')
const gameDivs = [document.getElementById('game0'), document.getElementById('game1'), document.getElementById('game2')]

let peer = new Peer();
let conn = null
let state = null

function handleData(data) {
  if(data.type != MessageType.StateUpdate) { return console.log(data) }
  state = data.data
  render()
}

function render() {
  idSpan.innerHTML = state.players[conn.label]
  playerList.innerHTML = Object.keys(state.players).map((label) => {
    return `<li>${state.players[label]}${label in state.queue ? ' (queued)':''}</li>`
  }).join('')

  generalButtons.innerHTML = `
  ${conn.label in state.queue ? '<button type="button" onclick="leaveGame()">Leave game</button>': '<button type="button" onclick="enterGame()">Join next game</button>'}
  `

  if(!state.started) {
    if(conn.label in state.queue) {
      generalButtons.innerHTML = '<button onclick="startGame()">Start Game</button>' + generalButtons.innerHTML
    }
    gameDivs[0].innerHTML = '';
    gameDivs[1].innerHTML = ''
    gameDivs[2].innerHTML = '' 
  } else {
    let isMyTurn = state.game.order[state.game.turn] != conn.label

    gameDivs[0].innerHTML = `<h2>${state.game.query}</h2>`
    if(isMyTurn || state.game.typed == ''){
      gameDivs[1].innerHTML = `<input type='text' id='input' onkeyup='typed(this)' onchange='submit(this)' ${!isMyTurn ?'':'disabled'} value='${state.game.typed}'>`;
      document.getElementById('input').select();
    }
    gameDivs[2].innerHTML = ''
    gameDivs[2].innerHTML += '<ul>' + state.game.order.map((label, idx) => {
      return `<li>${state.players[label]}${state.game.turn == idx ?'(turn)':''} - ${state.game.lastSolve[label]}</li>`
    }).join('') + '</ul>'
  }
}

function enterGame() { conn.send(EnterGame()) }
function leaveGame() { conn.send(LeaveGame()) }
function startGame() { conn.send(StartGameRequest()) }
function changeName() {
  conn.send(Rename(prompt("Enter new name", state.players[conn.label])))
}
function typed(elem) {
  conn.send(Typed(elem.value))
}
function submit(elem) {
  conn.send(Submit(elem.value))
  elem.focus();
  elem.select();
}


peer.on('open', (id) => {

  peer.on('close', () => { peer.destroy() })

  peer.on('disconnected', () => { peer.reconnect() })

  peer.on('error', (err) => { console.log(err) })

  conn = peer.connect(urlParams.get('id'), {reliable: true})
  conn.on('data', handleData)
  conn.on('open', () => {
    console.log('sending client hello')
    conn.send(ClientHello(conn.label))
  })
  conn.on('close', () => {console.log('closed')})
  conn.on('error', () => {console.log('error')})
 })

