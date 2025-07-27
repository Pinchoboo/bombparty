function createEnum(values) {
  const enumObject = {};
  for (const val of values) {
    enumObject[val] = val;
  }
  return Object.freeze(enumObject);
}


const MessageType = createEnum(
  ['ClientHello', 'Rename', 'StateUpdate', 'EnterGame', 'LeaveGame', 'StartGameRequest', 'Typed', 'Submit', 'Ping', 'Pong']
);

function message(type, data) {
  return { type: type, data: data }
}

function ClientHello() { return message(MessageType.ClientHello, null) }
function Rename(name) { return message(MessageType.Rename, { name: name }) }
function StateUpdate(state) { return message(MessageType.StateUpdate, state) }
function Typed(string) { return message(MessageType.Typed, string) }
function Submit(string) { return message(MessageType.Submit, string) }
function EnterGame() { return message(MessageType.EnterGame, null) }
function LeaveGame() { return message(MessageType.LeaveGame, null) }
function StartGameRequest() { return message(MessageType.StartGameRequest, null) }
function Ping(x) { return message(MessageType.Ping, x) }
function Pong(x) { return message(MessageType.Pong, x) }