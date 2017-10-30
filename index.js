#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {Program} = require('commandy');
const request = require('mini-request');


const appDataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : path.join(process.env.HOME, '.config'));
const keyPath = path.join(appDataPath, 'google-url-shortener-key.txt');

const getLastKey =  () => new Promise((resolve, reject) => {
		fs.readFile(keyPath, 'utf8', (err, data) => {
			if(err){
				reject(err);
			}else{
				resolve(data);
			}
		});
	});

const setLastKey = str => new Promise((resolve, reject) => {
		fs.writeFile(keyPath, str, err => {
			if(err){
				reject(err);
			}else{
				resolve();
			}
		});
	});

const removeProp = prop => obj => {
	delete obj[prop];
	return obj;
};

const getProp = prop => obj => obj[prop];


const main = new Program([
	['key', 'k'],
	['expand', 'e'],
	['help', 'h']
]);

const helpMessage = `
- Shorten URL: url-shortener [--key=<str>] <url>
If key is not set, the last used key is used.
- View last used key: url-shortener --key.
- Just set the key: url-shortener --key=<str>
- Expand an URL: url-shortener --expand <url>
Note: Aliases: -k for --key and -e for --expand.
`.trim();

const {args, options:{help, key: keys, expand}} = main.parse(process.argv.slice(2));

(async function(){
	const url = args[0];
	if((!url && keys.length === 0) || help.length > 0){
		console.log(helpMessage);
	}else{
		const keyStr = keys.find(key => typeof key === 'string');
		const key =
			keyStr
			? Promise.resolve(keyStr).then(key =>
				setLastKey(key).then(() => console.log('Key set.')).then(() => key)
			)
			: getLastKey();
		
		if(keys.some(key => key === true)){
			key.then(console.log);
		}
		
		if(url){
			if(expand.length > 0){
				request('https://www.googleapis.com/urlshortener/v1/url?shortUrl=' + url + '&key=' + await key)
					.then(JSON.parse)
					.then(removeProp('kind'))
					.then(console.log);
			}else{
				request('https://www.googleapis.com/urlshortener/v1/url?key=' + await key, {
					post: {longUrl: url}
				})
				.then(JSON.parse)
				.then(getProp('id'))
				.then(console.log)
				.catch(err => {
					console.log('There is no key set. See url-shortener --help for more.');
				});
			}
		}
	}
})();