let elems = {}

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

    updateTimer()
}

function render(state, label) {
    elems['username'].innerHTML = state.players[label]
    elems['players'].innerHTML = Object.keys(state.players).map((label) => {
        return `<li>${state.players[label]}${label in state.queue ? ' (queued)' : ''}</li>`
    }).join('')

    elems['buttons'].innerHTML = `
        ${label in state.queue ? '<button type="button" onclick="leaveGame()">Leave game</button>' : '<button type="button" onclick="enterGame()">Join next game</button>'}
    `

    if (!state.started) {
        if (label in state.queue) {
            elems['buttons'].innerHTML = '<button onclick="startGame()">Start Game</button>' + elems['buttons'].innerHTML
        }
        ['prompt', 'input', 'timer', 'order'].forEach((x) => elems[x].innerHTML = '');
    } else {
        let isMyTurn = state.game.order[state.game.turn] != label
        setTimer()
        elems['prompt'].innerHTML = `<h2>Type a word containing: ${state.game.query}</h2>`
        if (isMyTurn || state.game.typed == '') {
            elems['input'].innerHTML = `<input type='text' id='textinput' onkeyup='typed(this)' onchange='submit(this)' ${!isMyTurn ? '' : 'disabled'} value='${state.game.typed}'>`;
            document.getElementById('textinput').select();
        }
        elems['order'].innerHTML = '<ul>' + state.game.order.map((label, idx) => {
            return `<li>${state.players[label]} ${(String.fromCodePoint(10084) + String.fromCodePoint(65039)).repeat(state.game.lives[label])} ${state.game.turn == idx ? '(turn)' : ''} - ${state.game.lastSolve[label]}</li>`
        }).join('') + '</ul>'
    }
}

function updateTimer() {
    if (state?.started && state?.game?.deadline) {
        setTimeout(() => {
            setTimer()
            updateTimer()
        }, (state.game.deadline - Date.now()) % 1000);
    } else {
        elems['timer'].innerHTML = ''
        setTimeout(() => { updateTimer() }, 1000)
    }
}

function setTimer() {
    elems['timer'].innerHTML = `(${Math.max(0, ~~Math.ceil((state.game.deadline - Date.now()) / 1000))} sec)`
}
