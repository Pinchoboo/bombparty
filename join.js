const urlParams = new URLSearchParams(window.location.search);

let peer = new Peer();
let conn = null

function handleData(data) {
    if (data.type != MessageType.StateUpdate) { return console.log(data) }
    if (!state) { insert_game_html() }
    state = data.data;
    render(state, label)
}

peer.on('open', (id) => {

    peer.on('close', () => { peer.destroy() })

    peer.on('disconnected', () => { peer.reconnect() })

    peer.on('error', (err) => { console.log(err) })

    conn = peer.connect(urlParams.get('id'), { reliable: true })
    conn.on('data', handleData)
    conn.on('open', () => {
        label = conn.label
        console.log('sending client hello')
        conn.send(ClientHello(label))
    })
    conn.on('close', () => {
        console.log('closed')
        document.getElementsByTagName('body')[0].innerHTML = "<h1>Disconnected from server</h1><h2><a href='..'>Host one yourself?<a></h2>"
    })
    conn.on('error', () => { console.log('error') })
})

function action(x) {
    conn.send(x)
}

setTimeout(() => {
    if (!label) {
        document.getElementsByTagName('body')[0].innerHTML = "<h1>Could not connect to server</h1><h2><a href='..'>Host one yourself?<a></h2>"
    }
}, 4000)