const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const knex = require('knex');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const PAT = '9b35a24d8d174e648eb033c6164a0acc';
const USER_ID = 'aleksei';       
const APP_ID = 'aleksei';

function returnFaceBox(imgUrl){
  const raw = JSON.stringify({
          "user_app_id": {
              "user_id": USER_ID,
              "app_id": APP_ID
          },
          "inputs": [
              {
                  "data": {
                      "image": {
                          "url": imgUrl
                      }
                  }
              }
          ]
      });

    return {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': 'Key ' + PAT
        },
        body: raw
    };
}

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    host : process.env.DATABASE_HOST,
    port : 5432,
    user : process.env.DATABASE_USER,
    password : process.env.DATABASE_PW,
    database : process.env.DATABASE_DB
  }
});

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.post('/signin', (req,res) => {
	db.select('email', 'hash').from('login')
		.where('email', '=', req.body.email)
		.then(data => {
			bcrypt.compare(req.body.password, data[0].hash).
			then(result =>  {
    			if(result){
    				return db.select('*').from('users')
    					.where('email', '=', req.body.email)
    					.then(user => {
    						res.json(user[0])
    					})
    					.catch(err => res.status(400).json('unable to get user'))
    			}
    			else{
    				res.json('error logging in')
    			}    				
			});
		})
	.catch(err => res.status(400).json('wrong credentials'))	
})
app.get('/', (req, res) => {
  res.send('This is the homepage');
});
app.post('/register', (req, res) => {
	const {name, email, password} = req.body;
	const salt = bcrypt.genSaltSync(saltRounds);
	const hash = bcrypt.hashSync(password, salt);
	if(!name || !email || !password){
		return res.status(400).json('empty fields')
	}
	db.transaction(trx => {
		trx.insert({
			hash: hash,
			email: email
		})
		.into('login')
		.returning('email')
		.then(loginEmail => {
			return trx('users')
				.returning('*')
				.insert({
					name: name,
					email: loginEmail[0].email,
					joined: new Date()
				}).then(user => {
					res.json(user[0])
				})
			})
		.then(trx.commit)
		.catch(trx.rollback)
	})
	.catch(err => res.status(400).json('unable to register'))
})

app.get('/profile/:id', (req, res) => {
	const {id} = req.params;
	db('users').where({id})
		.then(user => {
			if(user.length){
				res.json(user[0])
			}
			else {
				res.status(400).json('Not found')
			}
		})
		.catch(err => res.status(400).json('error getting user'))
})

app.put('/image', (req, res) => {
	const {id} = req.body;

	db('users').where('id', '=', id)
	.increment('entries', 1)
	.returning('entries')
	.then(entries => {
		res.json(entries[0].entries)
	})
	.catch(err => res.status(400).json('Not found'))
})

app.post('/image', (req, res) => {
     const {input} = req.body;
     res.json(input);
    .catch(error => console.log('error', error));
})

app.listen(5432, () => {
	console.log('app is running on port 3001')
})
