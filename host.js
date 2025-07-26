label = 'host';
state.players[label] = label

let peer = new Peer();

function handleData(conn, type, data) {
    if (type == MessageType.ClientHello) {
        if (conn.label in connections) { return conn.close() }
        connections[conn.label] = conn
        state.players[conn.label] = `player_${data.name}`
        sendStateUpdate()
    } else if (!(conn.label in connections)) {
        return
    } else {
        update(conn.label, type, data)
    }
}

function action(x) {
    update(label, x.type, x.data)
}

function sendStateUpdate() {
    render(state, label)
    for (const conn of Object.values(connections)) {
        conn.send(StateUpdate(state))
    }
}

insert_game_html()
render(state, label)
peer.on('open', (id) => {
    // display join url
    let url = `${BasePath}join.html?id=${id}`
    document.getElementById('top_pannel').innerHTML = `Let others join: <a href=${url} target="_blank">${url}</a>`

    peer.on('connection', function (conn) {
        conn.on('data', (data) => handleData(conn, data.type, data.data));
        conn.on('close', () => removePlayer(conn.label))
        conn.on('error', (err) => { console.log(err) })
    });

    peer.on('close', () => { peer.destroy() })
    peer.on('disconnected', () => { peer.reconnect() })
    peer.on('error', (err) => { console.log(err) })
})