

var imageSchema = {
    'title': {
        in: 'body',
        isLength: {
            options: [{min: 1, max: 30}], // Must be between 1 and 30 characters
            errorMessage: 'Title must be between 1 and 30 characters'
        },
    },
    'picture': {
        in: 'body',
        optional: true,
        notEmpty: {
            errorMessage: 'picture URL must not be empty'
        },
        isURL: {
            options: [{protocols: ['https']}],
            errorMessage: 'picture URL must be valid and use HTTPS'
        },
    }
};

/* A middleware to validate incoming images in the request body, uses express-validator*/
var validator = function(req, res, next) {
    req.check(imageSchema);
    req.getValidationResult().then(function(result) {
        if (!result.isEmpty()) return res.status(400).send(result.useFirstErrorOnly().array()[0]);
        else next();
    });
};

/* Database image model*/
var Image = function(image) {
    this.type = image.file ? Image.Type.FILE : Image.Type.URL;
    this.picture = image.file || image.metadata.picture;
    this.gallery_owner = image.metadata.gallery_owner;
    this.title = image.metadata.title;
    this.createdAt = new Date();
};

Image.Type = {
    URL: 0,
    FILE: 1
};



/* REST response image model */
/**
    image: The database image object
    prevID: The ID of image that is before this owner
    nextID: The ID of the image that is after this one
    isGalleryOwner: True if the user requesting this image is the owner of the
                    gallery, otherwise false.
**/
var RESTImage = function(image) {
    this.id = image._id;
    this.gallery_owner = image.gallery_owner;
    this.title = image.title;
    if (image.type === Image.Type.FILE) {
        this.mimetype = image.picture.mimetype;
    }


};
RESTImage.prototype.createActionLinks = function(prevID, nextID, isGalleryOwner) {
    this.actions = {
        delete_image: !isGalleryOwner ? undefined : {
            href: '/api/users/' + this.gallery_owner + '/images/' + this.id,
            method: 'DELETE',
        },
        get_gallery: {
            href: '/api/users/' + this.gallery_owner,
            method: 'GET',
        },
        get_picture: {
            href: '/api/users/' + this.gallery_owner +'/images/' + this.id + '/picture',
            method: 'GET'
        },
        add_comment: {
            href: '/api/users/' + this.gallery_owner + '/images/' + this.id + '/comments',
            method: 'POST',
        },
        get_comments: {
            href: '/api/users/' + this.gallery_owner +'/images/' + this.id + '/comments',
            method: 'GET',
        },
        get_current_image: {
            href: '/api/users/' + this.gallery_owner + '/images/' + this.id,
            method: 'GET',
        },
        get_first_image: {
            href: '/api/users/' + this.gallery_owner +'/images/first',
            method: 'GET',
        },
        get_last_image: {
            href: '/api/users/' + this.gallery_owner +'/images/last',
            method: 'GET',
        },
        get_next_image: !nextID ? undefined :  {
            href:  '/api/users/' + this.gallery_owner +'/images/' + nextID,
            method: 'GET',
        },
        get_prev_image: !prevID ? undefined :{
            href: '/api/users/' + this.gallery_owner +'/images/' + prevID,
            method: 'GET'
        },
    };
};

module.exports.validator = validator;
module.exports.Image = Image;
module.exports.RESTImage = RESTImage;
