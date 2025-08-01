const IS_HOST = false;
const urlParams = new URLSearchParams(window.location.search);

let peer = new Peer();
let conn = null

let last_checked_server_message = -1
let last_server_message = null

function handleData(data) {
    if (data.type == MessageType.Ping) { last_server_message = data.data; return conn.send(Pong(Date.now())) }
    if (data.type != MessageType.StateUpdate) { return debug(data) }
    if (!state) { insert_game_html() }
    state = data.data.state;
    last_server_message = data.data.timestamp
    render(state, label)
}

peer.on('open', (id) => {
	onbeforeunload = (_) => { peer.destroy() }

    peer.on('close', () => {
		peer.destroy()
        document.getElementsByTagName('body')[0].innerHTML = "<h1>Disconnected from server</h1><h2><a href='./.'>Host one yourself?<a></h2>"
    })

    peer.on('disconnected', () => { peer.reconnect() })

    peer.on('error', (err) => { console.log(err) })

    conn = peer.connect(urlParams.get('id'), { reliable: true })
    conn.on('data', handleData)
    conn.on('open', () => {
        label = conn.label
        conn.send(ClientHello())
    })
    conn.on('close', () => {
        document.getElementsByTagName('body')[0].innerHTML = "<h1>Disconnected from server</h1><h2><a href='./.'>Host one yourself?<a></h2>"
    })
    conn.on('error', () => { console.log('error') })
})

function action(x) {
    conn.send(x)
}

function checkConnection() {
    if (!label) {
        document.getElementsByTagName('body')[0].innerHTML = "<h1>Could not connect to server</h1><h2><a href='./.'>Host one yourself?<a></h2>"
    } else if (last_server_message == last_checked_server_message) {
        document.getElementsByTagName('body')[0].innerHTML = "<h1>Disconnected from server </h1><h2><a href='./.'>Host one yourself?<a></h2>"
        conn.close()
    }
    last_checked_server_message = last_server_message
    setTimeout(checkConnection, 30 * 1000)
}
setTimeout(checkConnection, 5 * 1000)