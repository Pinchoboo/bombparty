const urlParams = new URLSearchParams(window.location.search);
const IS_HOST = urlParams.get('id') === null;
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

function debug(_) {}

if(IS_HOST){
	let script = document.createElement('script');
	script.src = 'js/server.js';
	document.head.append(script)
} else {
	let script = document.createElement('script');
	script.src = '/js/join.js';
	document.head.append(script)
}