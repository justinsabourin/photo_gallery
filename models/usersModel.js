/*jshint esversion:6*/
var crypto = require('crypto');

var userSchema = {
    'username': {
        in: 'body',
        notEmpty: {
            errorMessage: 'Username cannot be empty'
        },
        isAlphanumeric: {
            errorMessage: 'Username must contain only letters and numbers'
        },
        isLength: {
            options: [{min: 3, max: 30}],
            errorMessage: 'Username must be between 3 and 30 characters'
        }
    },
    'password': {
        in: 'body',
        notEmpty: {
            errorMessage: 'Password cannot be empty'
        },
        isLength: {
            options: [{min: 4, max: 15}],
            errorMessage: 'Password must be between 4 and 15 characters',
        },
    }
};

/* A middleware to validate incoming users in the request body, uses express-validator*/
var validator = function(req, res, next) {
    req.check(userSchema);
    req.getValidationResult().then(function(result) {
        if (!result.isEmpty()) return res.status(400).send(result.useFirstErrorOnly().array()[0]);
        else next();
    });
};

/* Database user model */
var User = function(user) {
    this.username = user.username;
    this.salt = crypto.randomBytes(16).toString('base64');
    this.saltedHash = crypto.createHmac('sha512', this.salt).update(user.password).digest('base64');
};

/*REST response user model*/
var RESTUser = function(user) {
    this.username = user.username;

    this.actions = {
        get_galleries: {
            href: '/api/users',
            method: 'GET',
        },
        get_gallery: {
            href: '/api/users/' + user.username,
            method: 'GET'
        },
        get_thumbnail: {
            href: '/api/users/' + user.username + '/thumbnail',
            method: 'GET'
        },
    };
};
RESTUser.prototype.createActionLinks = function(isGalleryOwner, notEmpty) {
    if (isGalleryOwner) {
        this.actions.upload_image = {
            href: '/api/users/' + this.username + '/images',
            method: 'POST'
        };
    }
    if (notEmpty) {
        this.actions.get_first_image = {
            href: '/api/users/' + this.username + '/images/first',
            method: 'GET',
        };
    }
};



/* REST paginated users model */
var RESTUsers = function(page, last, limit, users) {
    this.users = users.map((user) => new RESTUser(user));
    this.page = page;
    this.total_pages = last;

    this.actions = {
        get_current_page: {
            href: '/api/users?limit=' + limit + '&page=' + page,
            method: 'GET'
        },
        get_last_page: {
            href: '/api/users?limit=' + limit + '&page=' + last,
            method: 'GET',
        },
        get_first_page: {
            href: '/api/users?limit=' + limit,
            method: 'GET',
        },
        get_next_page: page >= last ? undefined : {
            href:  '/api/users?limit=' + limit + '&page=' + (page + 1),
            method: 'GET',
        },
        get_prev_page: page <= 1 ? undefined : {
            href: '/api/users?limit=' + limit + '&page=' + (page - 1),
            method: 'GET',
        },
    };
};
RESTUsers.prototype.createActionLinks = function(username) {
    this.actions.get_my_gallery = {
        href: '/api/users/' + username,
        method: 'GET'
    };
};

module.exports.validator = validator;
module.exports.User = User;
module.exports.RESTUser = RESTUser;
module.exports.RESTUsers = RESTUsers;
