let state = null
let label = null

function enterGame() { action(EnterGame()) }
function leaveGame() { action(LeaveGame()) }
function startGame() { action(StartGameRequest()) }
function changeName() {
  action(Rename(prompt("Enter new name", state.players[label])))
}
function typed(elem) {
  action(Typed(elem.value))
}
function submit(elem) {
  action(Submit(elem.value))
  elem.focus();
  elem.select();
}

function debug(x) {}