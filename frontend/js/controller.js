(function(model, view) {
    "use strict";

    window.onload = function() {
        var match = location.pathname.match(/\/([a-zA-Z0-9]*)\/([a-zA-Z0-9]*)/);
        if (match) {
            model.getGallery({
                href: `/api/users/${match[1]}`,
                method: 'GET',
            }, function() {
                model.getImage({
                    href: `/api/users/abcdef/images/${match[2]}`,
                    method: 'GET'
                });
            });
        } else {
            model.getGalleries({
                href: '/api/users',
                method: 'GET',
            });
    }
    };

    // view events

    document.addEventListener('login', function(e) {
        model.login(e.detail);
    });

    document.addEventListener('signup', function(e) {
        model.signup(e.detail);
    });

    document.addEventListener('signout', function(e) {
        model.signout();
        view.navigate('login');
    });

    document.addEventListener('getGallery', function(e) {
        model.getGallery(e.detail);
    });

    document.addEventListener('getImage', function(e) {
        model.getImage(e.detail);
    });

    document.addEventListener('getComments', function(e) {
        model.getCommentsPage(e.detail);
    });

    document.addEventListener('uploadImage', function(e) {
        model.addImage(e.detail.action, e.detail.data);
    });

    document.addEventListener('deleteImage', function(e) {
        model.deleteImage(e.detail);
    });

    document.addEventListener('addComment', function(e) {
        model.addComment(e.detail.action, e.detail.refreshCommentsAction, e.detail.comment);
    });

    document.addEventListener('deleteComment', function(e) {
        model.deleteComment(e.detail.action, e.detail.refreshCommentsAction);
    });

    document.addEventListener('getGalleries', function(e) {
        model.getGalleries(e.detail);
    });

    // model events

    document.addEventListener('onError', function(e) {
        view.renderErrorModal(e.detail);
    });

    document.addEventListener('onUploadError', function(e) {
        view.uploadError(e.detail);
    });

    document.addEventListener('onAuthenticateSuccess', function(e) {
        var user = e.detail;
        model.getGalleries(user.actions.get_galleries);
    });

    document.addEventListener('onAuthenticateFailure', function(e) {
        view.navigate('login', e.detail);
    });

    document.addEventListener('onSignupSuccess', function(e) {
        view.navigate('login');
    });

    document.addEventListener('onSignupFailure', function(e) {
        view.navigate('signup', e.detail);
    });

    document.addEventListener('onGalleries', function(e) {
        view.navigate('galleries', e.detail);
    });

    document.addEventListener('onGallery', function(e) {
        view.navigate('gallery', e.detail);
    });

    document.addEventListener('onGalleryFailure', function(e) {
        view.navigate('empty', e.detail);
    });

    document.addEventListener('onImage', function(e) {
        view.renderImage(e.detail);
    });

    document.addEventListener('onComments', function(e) {
        view.renderComments(e.detail);
    });




})(model, view);
