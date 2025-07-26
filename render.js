let elems = {}
let renderstate = {}

function x(s) {
    return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function insert_game_html() {
    document.getElementsByTagName('game')[0].innerHTML = `
        <span id="prompt"></span>
        <div style="display: grid; grid-auto-flow: column;">
            <span id="input"></span><span id="timer"></span>
        </div>
        <span id="order"></span>
        <h3>Username:
            <span id="username"></span>
            <button type="button" onclick="changeName()">change</button>
        </h3>
        <div id="buttons"></div>
        <h2>Players on server:</h1>
        <ul id='players'></ul>
    `;
    ['prompt', 'input', 'timer', 'order', 'username', 'buttons', 'players'].forEach((x) => { elems[x] = document.getElementById(x) });
    timerLoop()
}

function render(state, label) {
    elems['username'].innerHTML = x(state.players[label])
    elems['buttons'].innerHTML = `
        ${label in state.queue ? '<button type="button" onclick="leaveGame()">Leave game</button>' : '<button type="button" onclick="enterGame()">Join next game</button>'}
    `
    renderPlayers()

    if (!state.started) {
        ['prompt', 'input', 'timer', 'order'].forEach((x) => elems[x].innerHTML = '');
        if (label in state.queue) {
            elems['buttons'].innerHTML = '<button onclick="startGame()">Start Game</button>' + elems['buttons'].innerHTML
        }
    } else {
        renderTimer()
        renderPrompt()
        renderInput(state, label)
        renderOrder()
    }
}

function renderTimer() {
    elems['timer'].innerHTML = `(${Math.max(0, ~~Math.ceil((state.game.deadline - Date.now()) / 1000))} sec)`
}

function renderInput(state, label) {
    let isMyTurn = state.game.order[state.game.turn] == label
    let textinput = document.getElementById('textinput')
    if (!textinput) {
        elems['input'].innerHTML = `<input type='text' id='textinput' onkeyup='typed(this)' onchange='submit(this)' ${!isMyTurn ? 'disabled' : ''} value='${state.game.typed}'>`;
        textinput = document.getElementById('textinput')
    } else if (!isMyTurn || (state.game.typed == '' && textinput.disabled)) {
        textinput.value = state.game.typed
    }
    textinput.disabled = !isMyTurn;
    if (isMyTurn && state.game.typed == '') { textinput.focus() }
}

function renderPrompt() {
    elems['prompt'].innerHTML = `<h2>Type a word containing: ${state.game.query}</h2>`
}

function renderOrder() {
    elems['order'].innerHTML = '<ul>' + state.game.order.map((label, idx) => {
        let name = x(state.players[label])
        let turn = state.game.turn == idx
        if (turn) { name = `<b>${name}</b>` }
        return `<li ${turn ? '' : 'style="list-style:none"'}>${name} ${hearts(state.game.lives[label])} - ${state.game.lastSolve[label]}</li>`
    }).join('') + '</ul>'
}

function renderPlayers() {
    elems['players'].innerHTML = Object.keys(state.players).map((label) => {
        return `<li>${label in state.queue ? '(queued)' : ''} ${x(state.players[label])}</li>`
    }).join('')
}

function timerLoop() {
    if (state?.started && state?.game?.deadline) {
        setTimeout(() => {
            renderTimer()
            timerLoop()
        }, (state.game.deadline - Date.now()) % 1000);
    } else {
        elems['timer'].innerHTML = ''
        setTimeout(() => { timerLoop() }, 1000)
    }
}

function hearts(times) {
    return (String.fromCodePoint(10084) + String.fromCodePoint(65039)).repeat(times)
}