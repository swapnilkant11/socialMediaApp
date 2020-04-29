// Load modules .
const express = require('express');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const Handlebars = require('handlebars');
const methodOverride = require('method-override');
const {allowInsecurePrototypeAccess} = require('@handlebars/allow-prototype-access');

// Connect to MongoURI exported from external file.
const keys = require('./config/keys.js');
// Load models.
const User = require('./models/user.js');
const Post = require('./models/post');
// Link passports to the server.
require('./passport/google-passport');
require('./passport/facebook-passport');
// Link helpers.
const {
    ensureAuthentication,
    ensureGuest
} = require('./helpers/auth');
// Initialize our application.
const app = express();

app.engine('handlebars', exphbs({
    defaultLayout: 'main',
    handlebars: allowInsecurePrototypeAccess(Handlebars)
}));
app.set('view engine', 'handlebars');

// Express config.
app.use(cookieParser());
app.use(bodyParser.urlencoded({ 
    extended: false 
}));
app.use(bodyParser.json());
app.use(session({ 
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true 
}));
app.use(methodOverride('_method'));
app.use(passport.initialize());
app.use(passport.session());

// Golbal variables for user.
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});

// Setup template engine for the view.
app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));

app.set('view engine', 'handlebars');
// Setup static files to serve css javascript and images.
app.use(express.static('public'));
mongoose.Promise = global.Promise;
// connect to remote database.
mongoose.connect(keys.MongoURI, {
    useUnifiedTopology: true,
    useNewUrlParser: true
})
.then(() =>{
    console.log(`Connected to remote database....`);
}).catch((err) => {
    console.log(err);
});

// Set environment variable for port.
const port = process.env.PORT || 3000;

// Handle routes.
app.get('/', ensureGuest, (req, res) => {
    res.render('home');
});

app.get('/about', (req, res) => {
    res.render('about');
});

// Google auth route.
app.get('/auth/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
}));

app.get('/auth/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login'
 }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/profile');
  });

// Facebook auth route.
app.get('/auth/facebook',
  passport.authenticate('facebook',{
      scope: 'email'
  }));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { 
      failureRedirect: '/' 
  }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/profile');
  });

// Handdle profile route.
app.get('/profile', ensureAuthentication, (req, res) => {
    Post.find({user: req.user._id})
    .populate('user')
    .sort({date:'desc'})
    .then((posts) => {
        res.render('profile', {
            posts:posts
        });
    }); 
});
// Handle route for ALL USERS.
app.get('/users', ensureAuthentication, (req, res) => {
    User.find({}).then((users) =>{
        res.render('users', {
            users:users
        });
    });
});

// Display one USER profile.
app.get('/user/:id', ensureAuthentication, (req, res) => {
    User.findById({_id: req.params.id})
    .then((user) => {
        res.render('user', {
            user:user
        });
    });
});

// Handle email POST route.
app.post('/addEmail', ensureAuthentication, (req, res) => {
    const email = req.body.email;
    User.findById({_id: req.user._id})
    .then((user) => {
        user.email = email;
        user.save()
        .then(() => {
            res.redirect('/profile');
        })
    })
})
// Handle phone route.
app.post('/addPhone', ensureAuthentication, (req, res) => {
    const phone = req.body.phone;
    User.findById({_id: req.user._id})
    .then((user) => {
        user.phone = phone;
        user.save()
        .then(() => {
            res.redirect('/profile');
        })
    });
});

// Handle location POST route.
app.post('/addLocation', ensureAuthentication, (req, res) => {
    const location = req.body.location;
    User.findById({_id: req.user._id})
    .then((user) => {
        user.location = location;
        user.save()
        .then(() => {
            res.redirect('/profile');
        })
    });
});

// Handle get routes for POST.
app.get('/addPost', ensureAuthentication, (req, res) => {
    res.render('addPost');
});
// Handle post route.
app.post('/savePost', ensureAuthentication, (req, res) => {
    var allowComments;
    if(req.body.allowComments){
        allowComments = true;
    }else{
        allowComments = false;
    }
    const newPost = {
        title: req.body.title,
        body: req.body.body,
        status: req.body.status,
        allowComments: allowComments,
        user: req.user._id
    }
    new Post(newPost).save()
    .then(() => {
        res.redirect('/posts');
    });
});
// Handle EDIT POST route.
app.get('/editPost/:id', ensureAuthentication, (req, res) => {
    Post.findOne({_id: req.params.id})
    .then((post) => {
        res.render('editingPost', {
            post:post
        });
    });
});
// Handle PUT route to SAVE EDITED POST.
app.put('/editingPost/:id', ensureAuthentication, (req, res) => {
    Post.findOne({_id: req.params.id})
    .then((post) => {
        var allowComments;
        if(req.body.allowComments){
            allowComments = true;
        }else{
            allowComments = false;
        }
        post.title = req.body.title;
        post.body = req.body.body;
        post.status = req.body.status;
        post.allowComments = allowComments;
        post.save()
        .then(() => {
            res.redirect('/profile');
        });
    });
});
// Handle DELETE route.
app.delete('/:id', ensureAuthentication, (req, res) => {
    Post.remove({_id: req.params.id})
    .then(() => {
        res.redirect('profile');
    })
})
// Handle posts route
app.get('/posts', ensureAuthentication, (req, res) => {
    Post.find({status: 'public'})
    .populate('user')
    .populate('comments.commentUser')
    .sort({date: 'desc'})
    .then((posts) => {
        res.render('publicPosts', {
            posts:posts
        });
    });
});
// Handle display single users all public posts.
app.get('/showposts/:id', ensureAuthentication, (req, res) => {
    Post.find({user: req.params.id, status: 'public'})
    .populate('user')
    .sort({date: 'desc'})
    .then((posts) => {
        res.render('showUserPosts', {
            posts:posts
        });
    });
});
// Handle comments save to database
app.post('/addComment/:id', ensureAuthentication, (req, res) => {
    Post.findOne({_id: req.params.id})
    .then((post) => {
        const newComment = {
            commentBody: req.body.commentBody,
            commentUser: req.user._id
        }
        post.comments.push(newComment)
        post.save()
        .then(() => {
            res.redirect('/posts');
        })
    });
});
// User logout handle route.
app.get('/logout', (req, res) => {
    req.logOut();
    res.redirect('/');
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});