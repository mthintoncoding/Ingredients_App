const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const passport = require('passport');
const session = require('express-session');
const express = require('express');
const cookieParser = require('cookie-parser');
const serveStatic = require('serve-static');
const mongoose = require('mongoose');


const {User} = require('./models');

const router = express.Router();

mongoose.Promise = global.Promise;


router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());




 passport.use(new LocalStrategy(
  function(username, password, done) {
    User.findOne({ username: username }, function (err, user) {
      if (err) { return done(err); }
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (!user.validatePassword(password)) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    });
  }
));

 router.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: false,
	cookie: {}
}));

router.use(passport.initialize());
router.use(passport.session());

passport.serializeUser(function (user, done) {
    done(null, user.id);
    //log in, send back to client
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

router.get('/', (req, res) => {
	User
	.findById(req.session.passport.user, function(err, user){
		var obj = {savedRecipes: user.savedRecipes}
		res.status(200).json({savedRecipes: user.savedRecipes})
		})
})

router.put('/', (req, res) =>{
	User
	.findByIdAndUpdate(
		req.session.passport.user,
		{$push: {savedRecipes: {label: req.body.recipe.label, image: req.body.recipe.image}}},
		{safe: true, upsert: true, new : true},
	 function (err, record) {
	 	res.json({record});
	});

 });

router.put('/deleteRecipe/', (req,res) => {
	User
	.findByIdAndUpdate(req.session.passport.user,
		{$pull: {savedRecipes: {_id: req.body._id}}},
		(err, user) => {
      console.log('Deleted!')
			User.findById(req.session.passport.user, (err, user) => {
				if(err){
					res.send(err);
				}
				res.json({user})
				});
			})
})

router.post('/', (req, res) => {

	let {username, password, firstName, lastName} = req.body;//those 4 properties being picked out from req.body from AJAX request

return User
.find({username})
.count()
.exec()
.then(count => {
	if(count > 0){
		return res.status(422).json({message: 'username already taken'});
	}
	return User.hashPassword(password)
})
	.then(hash => {
		return User
		.create({
			username: username,
			password: hash,
			firstName: firstName,
			lastName: lastName
		});

	})
	.then(user => {
		return res.status(201).json({username: user.username,
									firstName: user.firstName,
									lastName: user.lastName
		});
	})
	.catch(err => {
		res.status(500).json({message: 'Internal server error'})
	});
});



 router.get('/existing',
  passport.authenticate('local', { session: true }),
  function(req, res) {
  	User
  	.find({username: req.body.username})
  	.exec()
  	.then(function(user){
  		if( user.validatePassword(req.body.password)){
  			res.json({user});
  		}
  		else{
  			res.sendStatus(403);
  		}
  	})
  	.catch(function(err){
  		res.send(err);
  	})

  });


 router.get('/logout', function(req, res) {
	req.session.destroy(function (err) {
		if(err){
			res.send(err);
		}
		res.json({loggedout : true})
  	});
})

module.exports = {router};
