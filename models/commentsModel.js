/*jshint esversion:6*/

var commentSchema = {
    'text': {
        in: 'body',
        notEmpty: true,
        errorMessage: 'Comment text must not be empty',
    },
};

/* A middleware to validate incoming comments in the request body, uses express-validator*/
var validator = function(req, res, next) {
    req.check(commentSchema);
    req.getValidationResult().then(function(result) {
        if (!result.isEmpty()) return res.status(400).send(result.useFirstErrorOnly().array()[0]);
        else next();
    });
};

/* Database comment model */
var Comment = function(comment, image_id) {
    this.author = comment.author;
    this.text = comment.text;
    this.image_id = image_id;
};

/* REST response comment model */
/**
    comment: the database comment object to return
    galleryOwner: The owner of the gallery that this comment is in
    isCommentOwner: true if the user requesting this comment is the creator
                    of the comment, otherwise false.
**/
var RESTComment = function(comment) {
    this.id = comment._id;
    this.image_id = comment.image_id;
    this.author = comment.author;
    this.text = comment.text;
    this.createdAt= comment.createdAt;

};
RESTComment.prototype.createActionLinks = function(galleryOwner, canDelete) {
    this.actions = {
        delete_comment: !canDelete ? undefined : {
            href: '/api/users/' + galleryOwner + '/images/' + this.image_id + '/comments/' + this.id,
            method: 'DELETE',
        },
    };
};



/* REST paginated comments model */
var RESTComments = function(comments, currentPage, totalPages, imageID) {
    this.page = currentPage;
    this.image_id = imageID;
    this.total_pages = totalPages;
    this.comments = comments.map((comment) => new RESTComment(comment));
};
RESTComments.prototype.createActionLinks = function(galleryOwner, limit) {
    this.actions = {
        get_current_page: {
            href: '/api/users/' + galleryOwner + '/images/' + this.image_id + '/comments?limit=' + limit + '&page=' + this.page,
            method: 'GET',
        },
        get_last_page: {
            href: '/api/users/' + galleryOwner + '/images/' + this.image_id + '/comments?limit=' + limit + '&page=' + this.total_pages,
            method: 'GET',
        },
        get_first_page: {
            href: '/api/users/' + galleryOwner + '/images/' + this.image_id +'/comments?limit=' + limit,
            method: 'GET',
        },
        get_next_page: this.page >= this.total_pages ? undefined : {
            href: '/api/users/' + galleryOwner + '/images/' + this.image_id + '/comments?limit=' + limit + '&page=' + (this.page + 1),
            method: 'GET',
        },
        get_prev_page: this.page <= 1 ? undefined : {
            href: '/api/users/' + galleryOwner + '/images/' + this.image_id + '/comments?limit=' + limit + '&page=' + (this.page - 1),
            method: 'GET',
        }
    };
};

module.exports.validator = validator;
module.exports.Comment = Comment;
module.exports.RESTComment = RESTComment;
module.exports.RESTComments = RESTComments;
