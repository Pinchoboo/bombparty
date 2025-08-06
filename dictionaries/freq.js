const fs = require('fs');

file = 'spanish'

const data = {};
for(const word of [...new Set(fs.readFileSync(`./${file}.txt`, 'utf8').split(/\s+/))]){
	let syllables = new Set()
	for(let i = 0; i < word.length - 2; i++){
		syllables.add(word.slice(i, i+3))
	}
	for(let i = 0; i < word.length - 1; i++){
		syllables.add(word.slice(i, i+2))
	}
	for(const syllable of [...syllables]){
		data[syllable] = (data[syllable] || 0) + 1
	}
}
let data2 = {}
for (const [key, value] of Object.entries(data)) {
  data2[value] = (data2[value] || [])
  data2[value].push(key) 
}
data2 = Object.entries(data2)
data2 = data2.map((e) => [Number(e[0]), e[1]])
fs.writeFileSync(`${file}.freq.json`, JSON.stringify(data2));