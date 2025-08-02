let elems = {}
let renderstate = { input: { wrongCount: 0, turn: 0 } }

function x(s) {
	return String(s)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function insertJoinUrl(url) {
	document.getElementById('invite').innerHTML = `Invite link <a href="${url}" target="_blank">&#128279;</a>`;
}

function insertGameHtml() {
	document.getElementsByTagName('game')[0].innerHTML = `
        <span id="prompt"></span><span id="timer"></span>
		<div id="input"></div>
        <div id="bonus"></div>
        <span id="order"></span>
        <div id="buttons"></div>
		<div id="joining"></div>
    `;
	['prompt', 'bonus', 'input', 'timer', 'order', 'joining', 'username', 'buttons', 'players'].forEach((x) => { elems[x] = document.getElementById(x) });
	insertSettings()
	enablePanels()
	timerLoop()
}

function insertSettings() {
	if (IS_HOST) {
		let right_content = document.getElementById('right_content')
		right_content.innerHTML = `
			<h3>Settings</h3>
			<label for="anyone_can_start_input">Anyone can start a game</label>
			<input type="checkbox" id="anyone_can_start_input" ${DEFAULT_ANYONE_CAN_START ? 'checked' : ''} onchange='update_settings(this)'>
			<br>
			<label for="seconds_input">Seconds for each turn</label>
			<input type="number" id="seconds_input" value="${DEFAULT_SECONDS}" onchange='update_settings(this)'>
			<br>
			<label for="lives_input">Lives at start of game</label>
			<input type="number" id="lives_input" value="${DEFAULT_LIVES}" onchange='update_settings(this)'>
			<br>
			<label for="alphabet_input">Custom alphabet (empty is none)</label>
			<input type="text" id="alphabet_input" value="${DEFAULT_ALPHABET}" onchange='update_settings(this)'>
			<br>
			<label for="custom_dictionary_input">Custom dictionary (space separated words)</label>
			<label class="file-label">
				<input type="file" id="custom_dictionary_input" class="file-input" onchange="update_settings(this)">
				Choose File
			</label>
		`
	}
}

function render(state, label) {
	elems['username'].innerHTML = x(state.players[label])
	elems['buttons'].innerHTML = `
        ${label in state.queue ? '<button type="button" onclick="leaveGame()">Leave game</button>' : '<button type="button" onclick="enterGame()">Join next game</button>'}
    `
	renderPlayers(state, label)

	if (!state.started) {
		['prompt', 'bonus', 'input', 'timer', 'order'].forEach((x) => elems[x].innerHTML = '');

		if (label in state.queue || (IS_HOST && Object.keys(state.queue).length > 0)) {
			if (state.settings.anyone_can_start || IS_HOST) {
				elems['buttons'].innerHTML = '<button onclick="startGame()">Start Game</button>' + elems['buttons'].innerHTML
			} else {
				elems['buttons'].innerHTML = '<button disabled>Waiting for host to start</button>' + elems['buttons'].innerHTML
			}
		}
		renderJoining(state)
	} else {
		elems['joining'].innerHTML = ''
		renderTimer(state)
		renderPrompt(state)
		renderBonus(state, label)
		renderInput(state, label)
		renderOrder(state)
	}
}

function renderTimer(state) {
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
	if (state.game.wrongCount != renderstate.input.wrongCount) {
		renderstate.input.wrongCount = state.game.wrongCount
		textinput.classList.remove('invalid')
		setTimeout(() => textinput.classList.add('invalid'), 100)

	}
	if (state.game.typed == '' || state.game.turn != renderstate.input.turn) {
		renderstate.input.turn = state.game.turn;
		textinput.classList.remove('invalid')
	}
	if (isMyTurn && state.game.typed == '') { textinput.focus() }
}

function renderPrompt(state) {
	elems['prompt'].innerHTML = `<h2>Type a word containing: ${x(state.game.query)}</h2>`
}

function renderBonus(state, label) {
	if (state.game.order.includes(label)) {
		let letters_to_use = ''
		for (const [key, value] of Object.entries(state.game.letters[label])) {
			if (value > 0) { letters_to_use += key }
		}
		if (letters_to_use.length > 0) {
			elems['bonus'].innerHTML = `Bonus life when using all letters: ${x(letters_to_use)}`
		} else {
			elems['bonus'].innerHTML = ''
		}
	}
}

function renderOrder(state) {
	let order = [...state.game.order]
	elems['order'].innerHTML = '<ul>' + order.splice(state.game.turn).concat(order).map((label, idx) => {
		let name = x(state.players[label])
		let turn = idx === 0
		if (turn) { name = `<b>${name}</b>` }
		return `<li style="list-style:none">${IS_HOST ? kickInOrder(label) : ''} ${name} ${hearts(state.game.lives[label])} - ${x(state.game.lastSolve[label])}</li>`
	}).join('') + '</ul>'
}

function kickInOrder(label) {
	return `<span onclick="removePlayerFromGame('${x(label)}');sendStateUpdate()">&#10060;</span>`
}

function renderPlayers(state, label) {
	elems['players'].innerHTML = Object.keys(state.players).filter((other_label) => {
		return label != other_label
	}).map((label) => {
		return `<div>${x(state.players[label])}</div>`
	}).join('')
}

function renderJoining(state) {
	elems['joining'].innerHTML = '<br>' + Object.keys(state.players).filter((label) => {
		return label in state.queue
	}).map((label) => {
		return `<div>${x(state.players[label])}</div>`
	}).join('')
}

function timerLoop() {
	if (state?.started && state?.game?.deadline) {
		setTimeout(() => {
			renderTimer(state)
			timerLoop()
		}, (state.game.deadline - Date.now()) % 1000);
	} else {
		elems['timer'].innerHTML = ''
		setTimeout(() => { timerLoop() }, 1000)
	}
}

function hearts(times) {
	return ("&#10084;&#65039;").repeat(times)
}

function togglePanel(id) {
	const panel = document.getElementById(id);
	const center = document.getElementsByTagName('game')[0];
	panel.classList.toggle('open');
	if (id === 'left') {
		document.getElementById('person').classList.toggle('shift')
		center.classList.toggle('shift-left');
	} else if (id === 'right') {
		document.getElementById('gear').classList.toggle('shift')
		center.classList.toggle('shift-right');
	}
}


function enablePanels() {
	setTimeout(() => {
		togglePanel('left')
		document.getElementById('gear').classList.add('shift')
		document.getElementById('gear').classList.remove('hidden')
		setTimeout(() => {
			document.getElementById('person').classList.remove('hidden')
			document.getElementById('gear').classList.remove('shift')
		}, 300)
	}, 100)
}