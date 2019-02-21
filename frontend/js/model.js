var model = (function() {
    "use strict";

    /** Modified from labs **/
    function doAjax(method, url, body, json, callback){
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function(e){
            switch(this.readyState){
                 case (XMLHttpRequest.DONE):
                    if (this.status >= 200 && this.status < 300) {
                        return callback(null, this.responseText ? JSON.parse(this.responseText) : null);
                    }else{
                        return callback({status: this.status, message: this.responseText}, null);
                    }
            }
        };
        xhttp.open(method, url, true);
        if (json && body){
            xhttp.setRequestHeader('Content-Type', 'application/json');
            xhttp.send(JSON.stringify(body));
        } else{
            xhttp.send(body);
        }
    }


    var model = {};

    model.login = function(credentials) {
        doAjax('POST', '/api/signin', credentials, true, function(err, response){
            if (err) {
                document.dispatchEvent(new CustomEvent('onAuthenticateFailure', {detail: err}));
                return;
            }
            document.dispatchEvent(new CustomEvent('onAuthenticateSuccess', {detail: response}));
        });
    };

    model.signup = function(credentials) {
        doAjax('POST', '/api/users', credentials, true, function(err, response){
            if (err) {
                document.dispatchEvent(new CustomEvent('onSignupFailure', {detail: err}));
                return;
            }
            document.dispatchEvent(new CustomEvent('onSignupSuccess', {detail: credentials}));
        });
    };

    model.signout = function() {
        doAjax('GET', '/api/signout', null, false, function(err) {
            if (err) {
                document.dispatchEvent(new CustomEvent('onError', {detail: err}));
            }
        });
    };

    model.getGalleries = function(action) {
        doAjax(action.method, action.href, null, false, function(err, response) {
            if (err) {
                if (err.status === 403) {
                    document.dispatchEvent(new CustomEvent('onAuthenticateFailure', {detail: null}));
                } else {
                    document.dispatchEvent(new CustomEvent('onError', {detail: err}));
                }
                return;
            }
            document.dispatchEvent(new CustomEvent('onGalleries', {detail: response}));
        });
    };

    model.getGallery = function(action, cb) {
        doAjax(action.method, action.href, null, true, function(err, response) {
            if (err) {
                if (err.status === 403) {
                    document.dispatchEvent(new CustomEvent('onAuthenticateFailure', {detail: null}));
                } else {
                    document.dispatchEvent(new CustomEvent('onError', {detail: err}));
                }
                return;
            }
            document.dispatchEvent(new CustomEvent('onGallery', {detail: response}));
            if (cb) cb();
        });
    };

    model.getImage = function(action) {
        doAjax(action.method, action.href, null, true, function(err, response) {
            if (err) {
                if (err.status === 403) {
                    document.dispatchEvent(new CustomEvent('onAuthenticateFailure', {detail: null}));
                } else {
                    document.dispatchEvent(new CustomEvent('onError', {detail: err}));
                }
                return;
            }
            document.dispatchEvent(new CustomEvent('onImage', {detail: response}));
        });
    };

    model.addImage = function(action, image) {
        // var formData = new FormData();
        // formData.append("picture", image.picture);
        // formData.append("author", image.author);
        // formData.append("title", image.title);
        doAjax(action.method, action.href, image, true, function(err, response) {
            if (err) {
                if (err.status === 403) {
                    document.dispatchEvent(new CustomEvent('onAuthenticateFailure', {detail: null}));
                } else {
                    document.dispatchEvent(new CustomEvent('onUploadError', {detail: err}));
                }
                return;
            }
            document.dispatchEvent(new CustomEvent('onImage', {detail: response}));
        });
    };

    model.deleteImage = function(action) {
        doAjax(action.method, action.href, null, false, function(err, response) {
            if (err) {
                if (err.status === 403) {
                    document.dispatchEvent(new CustomEvent('onAuthenticateFailure', {detail: null}));
                } else {
                    err.message = "Could not delete image: " + err.message;
                    document.dispatchEvent(new CustomEvent('onError', {detail: err}));
                }
                return;
            }
        });
    };

    model.addComment = function(action, refreshCommentsAction, comment) {
        doAjax(action.method, action.href, comment, true, function(err, response) {
            if (err) {
                if (err.status === 403) {
                    document.dispatchEvent(new CustomEvent('onAuthenticateFailure', {detail: null}));
                } else {
                    err.message = "Could not add comment: " + err.message;
                    document.dispatchEvent(new CustomEvent('onError', {detail: err}));
                }
                return;
            }
            model.getCommentsPage(refreshCommentsAction);
        });
    };

    model.deleteComment = function(action, refreshCommentsAction) {
        doAjax(action.method, action.href, null, false, function(err, response){
            if (err) {
                if (err.status === 403) {
                    document.dispatchEvent(new CustomEvent('onAuthenticateFailure', {detail: null}));
                } else {
                    err.message = "Could not delete comment: " + err.message;
                    document.dispatchEvent(new CustomEvent('onError', {detail: err}));
                }
                return;
            }
            model.getCommentsPage(refreshCommentsAction);
        });


    };

    model.getCommentsPage = function(action) {
        doAjax(action.method, action.href, null, false, function(err, response) {
            if (err) {
                if (err.status === 403) {
                    document.dispatchEvent(new CustomEvent('onAuthenticateFailure', {detail: null}));
                } else {
                    err.message = "Could not get comments: " + err.message;
                    document.dispatchEvent(new CustomEvent('onError', {detail: err}));
                }
                return;
            }
            response.comments = response.comments && response.comments.map(function(comment) {
                comment.createdAt = new Date(comment.createdAt);
                return comment;
            });
            document.dispatchEvent(new CustomEvent('onComments', {detail: response}));
        });

    };

    return model;
})();
