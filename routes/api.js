const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const expressValidator = require('express-validator');
const monk = require('monk')

// Connection URL
const url = 'localhost:27017/photogallery';

const db = monk(url);

const users = 'users';
const images = 'images';
const comments = 'comments';

db.then(() => {
  console.log('Connected correctly to server');
  db.create(users).index('username', {unique: true});
  db.create(images);
  db.create(comments);
})


const usersModel = require('../models/usersModel');
const imagesModel = require('../models/imagesModel');
const commentsModel = require('../models/commentsModel');


router.use(expressValidator({
  errorFormatter: function(param, msg, value) {
      return msg;
  }
}));


/* REST Methods */

// Log in / out (Adapted from labs)

const checkPassword = function(user, password) {
  return user.saltedHash === crypto.createHmac('sha512', user.salt).update(password).digest('base64');
};

router.get('/signout/', function (req, res, next) {
  req.session.destroy(function(err) {
      if (err) return res.status(500).end(err);
      return res.end();
  });
});

router.post('/signin/', usersModel.validator, function (req, res, next) {
  db.get(users).findOne({username: req.body.username}, {}, function(err, user){
      if (err) return res.status(500).end(err);
      if (!user || !checkPassword(user, req.body.password)) return res.status(401).end("Wrong username or password");
      req.session.user = user;
      return res.json(new usersModel.RESTUser(user));
  });
});

const checkAuthenticated = function(req, res, next) {
  // Make sure user is signed in
  let user = req.session.user;
  if (!user) return next({status: 403, message: "Forbidden"});
  else return next();
};


// Create


router.post('/users', usersModel.validator, function(req, res, next) {
  let data = new usersModel.User(req.body);
  db.get(users).insert(data, {}, function(err, user) {
    if (err) return next({status: 500, message: "Username: " + data.username + " already exists."});
    res.status(201).json(new usersModel.RESTUser(user));
  });
});


router.post('/users/:username/images', checkAuthenticated, imagesModel.validator, function(req, res, next) {
  // Make sure user is owner of this gallery
  let user = req.session.user;
  if (user.username != req.params.username) return next({status: 403, message: "Forbidden"});
  // Sanitize inputs
  req.sanitizeBody('title').trim();
  req.sanitizeBody('title').escape();
  // Set the gallery owner for this image
  req.body.gallery_owner = user.username;
  // Insert it into db
  let data = new imagesModel.Image({metadata: req.body, file: req.file});
  db.get(images).insert(data, {}, function(err, image) {
      if (err) return next({status: 500, message: "Database error"});
      // Get the image created prior to this one
      db.get(images).findOne({ createdAt: { $lt : image.createdAt }}, { fields: { _id : 1 }, sort: { createdAt: -1 } }, function(err, prevID) {
          prevID = prevID && prevID._id;
          var restImage = new imagesModel.RESTImage(image);
          restImage.createActionLinks(prevID, null, user.username === req.params.username);
          res.status(201).json(restImage);
          return next();
      });
  });
});

router.post('/users/:username/images/:id/comments', checkAuthenticated, commentsModel.validator, function(req, res, next) {
  // Santize inputs
  req.sanitizeBody('text').trim();
  req.sanitizeBody('text').escape();
  // Set the author of comment
  req.body.author = req.session.user.username;
  let data = new commentsModel.Comment(req.body, req.params.id);
  // Check if user exists to distinguish between an empty galley and non existant gallery
  db.get(users).count({username: req.params.username}, { limit: 1 }, function(err, userExists) {
      if (err) return next({status: 500, message: "Database error"});
      if (!userExists) return next({status: 404, message: "User: '" + req.params.username + "' does not exist"});
      // make sure image exists
      db.get(images).count({ _id: data.image_id, gallery_owner: req.params.username }, {limit: 1}, function (err, imageExists) {
          if (err) return next({status: 500, message: "Database error"});
          if (!imageExists) return next({status: 404, message: "Image with id: '" + data.image_id + "' does not exist in " + req.params.username + "'s gallery'"});
          // Insert into db
          db.get(comments).insert(data, {}, function(err, comment) {
              if (err) return next({status: 500, message: "Database error"});
              let restComment = new commentsModel.RESTComment(comment);
              restComment.createActionLinks(req.params.username, true);
              res.status(201).json(restComment);
              return next();
          });
      });
  });

});

// Read

router.get('/users', checkAuthenticated, function(req, res, next) {
  // Get first page if page not specified or if query param malformed
  let page = +req.query.page || 1;
  page = page > 0 ? page : 1;
  // Let page have 10 comments if not specified or query is malformed
  let limit = +req.query.limit || 12;
  // limit can be at most 30 (to prevent large db look ups)
  limit = limit > 0 && limit < 30 ? limit : 30;
  let skips = (page - 1)* limit;
  db.get(users).find({}, { sort: { createdAt : -1}, skip: skips, limit: limit }, function(err, pagedUsers) {
      if (err) return next({status: 500, message: "Database error"});
      db.get(users).count({}, {}, function(err, total) {
          if (err) return next({status: 500, message: "Database error"});
          let restUsers = new usersModel.RESTUsers(page, Math.ceil(total / limit), limit, pagedUsers);
          restUsers.createActionLinks(req.session.user.username);
          res.json(restUsers);
          return next();
      });
  });
});


router.get('/users/:username', checkAuthenticated, function(req, res, next) {
  db.get(users).findOne({username: req.params.username}, {}, function(err, user) {
      if (err) return next({status: 500, message: "Database error"});
      if (!user) return next({status: 404, message: "User '" + req.params.username + "' does not exist"});
      let restUser = new usersModel.RESTUser(user);
      // check if gallery has images
      db.get(images).count({gallery_owner: req.params.username}, {limit: 1}, function (err, notEmpty) {
          if (err) return next({status: 500, message: "Database error"});
          restUser.createActionLinks(req.session.user.username === req.params.username, notEmpty);
          res.json(restUser);
      });
      
  });
});

router.get('/users/:username/thumbnail', checkAuthenticated, function(req, res, next) {
  db.get(images).findOne({gallery_owner: req.params.username}, { sort: {createdAt: 1} }, function(err, image) {
      if (err) return next({status: 500, message: "Database error"});
      else if (!image) return res.redirect('/media/empty.png');
      
      if (image.type === imagesModel.Image.Type.FILE) {
          res.setHeader('Content-Type', image.picture.mimetype);
          res.sendFile(image.picture.path, function(err) {
              if (err) return next({status: 500, message: "Unable to get image"});
              return next();
          });
      } else {
          res.redirect(image.picture);
          return next();
      }
  });
});

router.get('/users/:username/images/:id', checkAuthenticated, function(req, res, next) {
  let query = { gallery_owner: req.params.username }, sortBy;
  switch (req.params.id) {
      case 'first':
          sortBy = { createdAt: 1 };
          break;
      case 'last':
          sortBy = { createdAt: -1 };
          break;
      default:
          query._id = req.params.id;
          sortBy = {};
  }
  // Make sure user exists
  db.get(users).count({ username: req.params.username }, {limit: 1}, function(err, userExists) {
      if (err) return next({status: 500, message: "Database error"});
      if (!userExists) return next({status: 404, message: "User: '" + req.params.username + "' does not exist"});
      // Get the image
      db.get(images).findOne(query, { sort: sortBy }, function(err, image) {
          if (err) return next({status: 500, message: "Database error"});
          else if (!image && (req.params.id === 'first' || req.params.id === 'last')) return next({status: 404, message: "Gallery does not contain any images"});
          else if (!image) return next({status: 404, message: "Image with id: " + req.params.id + " does not exist"});
          // Get the image created prior to it
          db.get(images).findOne({ gallery_owner: req.params.username, createdAt: { $lt : image.createdAt }}, { fields: {_id : 1 }, sort: { createdAt : -1 } }, function(err, prevID) {
              if (err) return next({status: 500, message: "Database error"});
              prevID = prevID && prevID._id;
              // Get the image created after it
              db.get(images).findOne({ gallery_owner: req.params.username, createdAt: { $gt : image.createdAt }}, { fields: { _id : 1 }, sort: { createdAt : 1 }}, function(err, nextID) {
                  if (err) return next({status: 500, message: "Database error"});
                  nextID = nextID && nextID._id;
                  let restImage = new imagesModel.RESTImage(image);
                  restImage.createActionLinks(prevID, nextID, req.session.user.username === req.params.username);
                  res.json(restImage);
                  return next();
              });
          });
      });
  });

});

router.get('/users/:username/images/:id/picture/', checkAuthenticated, function(req, res, next) {
  db.get(images).findOne({ _id: req.params.id, gallery_owner: req.params.username }, {}, function(err, image) {
      if (err) return next({status: 500, message: "Database error"});
      else if (!image) return next({status: 404, message: "Image with id '" + req.params.id + "' does not exist"});
      if (image.type === imagesModel.Image.Type.FILE) {
          res.setHeader('Content-Type', image.picture.mimetype);
          res.sendFile(image.picture.path, function(err) {
              if (err) return next({status: 500, message: "Unable to get image"});
              return next();
          });
      } else {
          res.redirect(image.picture);
          return next();
      }

  });
});

router.get('/users/:username/images/:imageID/comments', checkAuthenticated, function(req, res, next) {
  // Get first page if page not specified or if query param malformed
  let page = +req.query.page || 1;
  page = page > 0 ? page : 1;
  // Let page have 10 comments if not specified or query is malformed
  let limit = +req.query.limit || 10;
  // limit can be at most 30 (to prevent large db look ups)
  limit = limit > 0 && limit < 30 ? limit : 30;
  let skips = (page - 1)* limit;
  // Make sure image exists
  db.get(images).count({ gallery_owner: req.params.username, _id: req.params.imageID }, { limit: 1 }, function(err, imageExists) {
      if (err) return next({status: 500, message: "Database error"});
      else if (!imageExists) return next({status: 404, message: "Image with id: " + req.params.imageID + " does not exist in this gallery"});
      // Get the comments
      db.get(comments).find({ image_id: req.params.imageID }, { sort: { createdAt : -1}, skip: skips, limit: limit }, function(err, pagedComments) {
          if (err) return next({status: 500, message: "Database error"});
          // Get the total number of comments for the image
          db.get(comments).count({ image_id: req.params.imageID }, {}, function(err, total) {
              if (err) return next({status: 500, message: "Database error"});
              let restComments = new commentsModel.RESTComments(pagedComments, page, Math.ceil(total / limit), req.params.imageID);
              restComments.createActionLinks(req.params.username, limit);
              restComments.comments.forEach(function(restComment) {
                  restComment.createActionLinks(req.params.username, req.params.username === req.session.user.username || req.session.user.username === restComment.author);
              });
              res.json(restComments);
              return next();
          });

      });
  });
});

// Update

// Delete

router.delete('/users/:username/images/:id', checkAuthenticated, function(req, res, next) {
  let user = req.session.user;
  if (user.username != req.params.username) return next({status: 403, message: "Forbidden"});
  // get the path of the image so the image will be deleted on disk
  db.get(images).findOne({ gallery_owner: user.username, _id: req.params.id }, function(err, image) {
      if (err) return next({status: 404, message: "Image with id: " + req.params.id + " does not exist"});
      db.get(images).remove({ gallery_owner: user.username, _id: req.params.id }, { multi: false }, function(err, deleted) {
          db.get(comments).remove({ image_id: req.params.id }, { multi: true }, function(err, deleted) {
              if (err) return next({status: 500, message: "Database error"});
          });
          if (image.type === imagesModel.Image.Type.FILE) {
              fs.unlink(image.picture.path, function(err) {
                  if (err) console.warn("Couldn't delete file: " + image.picture.path);
                  res.status(204).end();
                  return next();
              });
          } else {
              res.status(204).end();
              return next();
          }
      });
  });
});

router.delete('/users/:username/images/:imageID/comments/:commentID', checkAuthenticated, function(req, res, next) {
  let user = req.session.user;
  let query = { _id: req.params.commentID, image_id: req.params.imageID};
  // If this request is not made by the owner of the gallery, then only
  // delete the comment if the calling user made the comment
  if (user.username != req.params.username) {
      query.author = user.username;
  }
  db.get(comments).remove(query, { multi: false }, function(err, deleted) {
      if (err) return next({status: 500, message: "Database error"});
      if (!deleted) return next({status: 404, message: "Comment for image " + req.params.imageID + " with id: " + req.params.commentID + " does not exist"});
      res.status(204).end();
      return next();
  });
});

router.use(function (err, req, res, next) {
  if (err.status) {
      res.status(err.status).end(err.message);
  } else {
      return next(err);
  }
});


module.exports = router;