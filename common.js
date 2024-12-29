function createEnum(values) {
  const enumObject = {};
  for (const val of values) {
    enumObject[val] = val;
  }
  return Object.freeze(enumObject);
}


const MessageType = createEnum(
  ['ClientHello', 'Rename', 'StateUpdate', 'EnterGame', 'LeaveGame', 'StartGameRequest', 'Typed', 'Submit']
);

function message(type, data) {
  return {type: type, data: data}
}

function ClientHello(name) { return message(MessageType.ClientHello, {name: name}) }
function Rename(name) { return message(MessageType.Rename, {name: name}) }
function StateUpdate(state) { return message(MessageType.StateUpdate, state) }
function Typed(string) { return message(MessageType.Typed, string) }
function Submit(string) { return message(MessageType.Submit, string) }
function EnterGame() { return message(MessageType.EnterGame, null) }
function LeaveGame() { return message(MessageType.LeaveGame, null) }
function StartGameRequest() { return message(MessageType.StartGameRequest, null) }
