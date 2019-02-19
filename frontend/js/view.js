/*jshint esversion:6*/
var view = (function() {
    "use strict";

    
    window.onpopstate = function(e) {
        console.log(e);
    };

    // View interface

    var view = {};

    // navigate between galleries, gallery, login and signup
    view.navigate = function(page) {
        var views = document.getElementsByClassName('view');
        var viewHeaders = document.getElementsByClassName('header');
        if (view[page + 'Renderer']){
            view[page + 'Renderer'].apply(view, Array.prototype.slice.call(arguments, 1));
        }
        Array.prototype.forEach.call(views, function(view) {
            view.style.display = page + '-view' == view.id ? 'block' : 'none';
        });
        Array.prototype.forEach.call(viewHeaders, function(header) {
            header.style.display = page + '-header' == header.id ? 'flex' : 'none';
        });
        window.scrollTo(0,0);
    };

/* Login view listeners ------------------------------------------------------- */

    view.loginRenderer = function(err) {
        history.replaceState(null, null, '/login');
        var error = document.querySelector('#login-form span.error');
        if (err) {
            error.style.display = "block";
            error.textContent = err.message;
        } else {
            error.style.display = "none";
            document.getElementById('login-form').reset();
        }
    };

    document.getElementById('go-to-signup').onclick = function(e) {
        e.preventDefault();
        document.getElementById('login-form').reset();
        view.navigate('signup');
    };

    document.getElementById('login-form').onsubmit = function(e) {
        e.preventDefault();

        var data = {
            username: document.getElementById('login-username').value,
            password: document.getElementById('login-password').value,
        };
        document.dispatchEvent(new CustomEvent('login', {detail: data}));
    };


/* Sign up view listeners ----------------------------------------------------- */

    view.signupRenderer = function(err) {
        history.replaceState(null, null, '/signup');
        var error = document.querySelector('#signup-form span.error');
        if (err) {
            error.style.display = "block";
            error.textContent = err.message;
        } else {
            error.style.display = "none";
            document.getElementById('signup-form').reset();
        }
    };

    document.getElementById('go-to-login').onclick = function(e) {
        e.preventDefault();
        view.navigate('login');
    };

    document.getElementById('signup-form').onsubmit = function(e) {
        e.preventDefault();

        var data = {
            username: document.getElementById('signup-username').value,
            password: document.getElementById('signup-password').value,
        };

        document.dispatchEvent(new CustomEvent('signup', {detail: data}));
    };


/* Galleries view renderer and listeners */
    view.galleriesRenderer = function(galleries) {

        var galleriesView = document.getElementById('galleries-view');
        var galleriesList = galleriesView.children[0];
        var moreGalleriesButton = galleriesView.children[1];

        if (galleriesList.children.length === 0) {
            history.replaceState(null, null, '/');
        }

        document.getElementById('signout').onclick = function(e) {
            galleriesList.innerHTML = "";
            document.dispatchEvent(new CustomEvent('signout', {}));
        };
        document.getElementById('my-gallery').onclick = function() {
            galleriesList.innerHTML = "";
            document.dispatchEvent(new CustomEvent('getGallery', {detail: galleries.actions.get_my_gallery}));
        };

        if (galleries.actions.get_next_page) {
            moreGalleriesButton.style.display = "block";
            moreGalleriesButton.onclick = function() {
                document.dispatchEvent(new CustomEvent('getGalleries', { detail: galleries.actions.get_next_page }));
            };
        } else {
            moreGalleriesButton.style.display = "none";
        }

        
        galleries.users.forEach(function(gallery) {
            var box = document.createElement('div');
            box.classList.add('gallery-box');
            // prevent image from being cached
            var uncachedImage = gallery.actions.get_thumbnail.href + '?' + new Date();
            box.innerHTML = `
                <div class="gallery-username">${gallery.username}</div>
                <img src="${uncachedImage}"/>`;
            box.onclick = function() {
                galleriesList.innerHTML = "";
                document.dispatchEvent(new CustomEvent('getGallery', {detail: gallery.actions.get_gallery}));
            };
            galleriesList.appendChild(box);
        });
    };



/* Gallery view renderer and listeners */

    view.galleryRenderer = function(gallery, getImageAction) {

        document.getElementById('image-title').innerHTML = `
        <span class="title"></span>`;

        document.getElementById('go-back').onclick = function() {
            document.querySelector('#display img').src = "";
            document.dispatchEvent(new CustomEvent('getGalleries', {detail: gallery.actions.get_galleries}));
        };

        if (gallery.actions.upload_image) {
            document.getElementById('upload').style.display = 'block';
            document.getElementById('upload-image-form').onsubmit = function(e) {
                e.preventDefault();
                // Remove any error messages
                view.clearUploadError();
                var data = {};
                data.title = document.getElementById('upload-image-title').value;

                if (document.getElementById('url-radio-button').checked) {
                    data.picture = document.getElementById('upload-image-url').value.trim();
                } else {
                    data.picture = document.getElementById('upload-file').files[0];
                }

                if (data.title.trim() && data.picture) {
                    document.getElementById('upload-image-form').reset();
                    document.dispatchEvent(new CustomEvent('uploadImage', {
                        detail: {
                            action: gallery.actions.upload_image,
                            data: data,
                        }
                    }));
                } else {
                    view.uploadError({message: "Some fields are not filled in."});
                }
            };
            
        } else {
            document.getElementById('upload').style.display = 'none';
        }

        if (gallery.actions.get_first_image || getImageAction) {
            document.getElementById('display').style.display = "flex";
            document.getElementById('comment-section').style.display = "block";
            document.getElementById('empty-gallery').style.display = "none";
            document.dispatchEvent(new CustomEvent('getImage', {detail: getImageAction || gallery.actions.get_first_image}));
        } else {
            history.replaceState(null, null, '/' + gallery.username);
            document.getElementById('display').style.display = "none";
            document.getElementById('comment-section').style.display = "none";
            var message = document.getElementById('empty-gallery');
            message.style.display = "block";
            message.children[0].textContent = "Gallery is empty";

        }
    };

    // Toggle the upload button to show/hide upload modal
    document.getElementById('upload').onclick = function(e) {
        var target = document.getElementById('upload').children[0];
        if (target.nextSibling.textContent === 'Upload') {
          // change toggle
          target.nextSibling.textContent = 'Close';
          target.classList.add('rotate-45');

          // dont show back button
          document.getElementById('go-back').style.display = "none";
          // open modal
          document.getElementById('upload-modal').style.display = 'block';
        } else if (target.nextSibling.textContent === 'Close'){
          // change toggle
          target.nextSibling.textContent = 'Upload';
          target.classList.remove('rotate-45');

          // remove any errors
          view.clearUploadError();

          // show back button
          document.getElementById('go-back').style.display = "block";

          // close modal
          document.getElementById('upload-modal').style.display = 'none';
        }
    };

    // Handle URL vs upload in upload modal
    document.getElementById('url-radio-button').onclick = function(e) {
        document.getElementById('upload-file').style.display = 'none';
        document.getElementById('upload-image-url').style.display = 'block';
    };
    // Handle URL vs upload in upload modal
    document.getElementById('file-radio-button').onclick = function(e) {
        document.getElementById('upload-file').style.display = 'block';
        document.getElementById('upload-image-url').style.display = 'none';
    };
    // Show an error in upload modal
    view.uploadError = function(err) {
        var error = document.querySelector('#upload-modal span.error');
        error.style.display = "block";
        error.textContent = err.message;
    };
    // clear errors in upload modal
    view.clearUploadError = function() {
        var error = document.querySelector('#upload-modal span.error');
        error.style.display = "none";
    };


/* Image renderer */
    view.renderImage = function(image) {
        var emptyPage = document.getElementById('empty-gallery');
        if (emptyPage.style.display != "none") {
            /* Display the image if currently being shown an empty gallery */
            emptyPage.style.display = 'none';
            document.getElementById('display').style.display = "flex";
            document.getElementById('comment-section').style.display = "block";
        }

        var target = document.getElementById('upload').children[0];
        if (target.nextSibling.textContent === 'Close'){
            // change toggle
            target.nextSibling.textContent = 'Upload';
            target.classList.remove('rotate-45');
  
            // remove any errors
            view.clearUploadError();
  
            // show back button
            document.getElementById('go-back').style.display = "block";
  
            // close modal
            document.getElementById('upload-modal').style.display = 'none';
          }

        history.replaceState(null, null, '/' + image.gallery_owner + '/' + image.id);

        // Get the comments
        document.dispatchEvent(new CustomEvent('getComments', {detail: image.actions.get_comments}));

        // Set the title and author
        document.getElementById('image-title').innerHTML = `
        <span class="title">${image.title}</span>
        by
        <span>${image.gallery_owner}</span>`;
        
        // Add a delete button to the image if allowed
        if (image.actions.delete_image) {
            var deleteImage = document.getElementById('delete-image');
            deleteImage.style.display = 'block';
            deleteImage.onclick = function(e) {
                document.dispatchEvent(new CustomEvent('deleteImage', { detail: image.actions.delete_image }));
                var nextImageAction = image.actions.get_prev_image || image.actions.get_next_image;
                if (nextImageAction) {
                    document.dispatchEvent(new CustomEvent('getImage', { 
                        detail: nextImageAction
                    }));
                } else {
                    document.dispatchEvent(new CustomEvent('getGallery', { 
                        detail: image.actions.get_gallery,
                    }));
                }
                
            };
        } else {
            document.getElementById('delete-image').style.display = 'none';
        }

        // Set the image tag in the display
        var display = document.getElementById("display");
        display.children[1].children[0].src = image.actions.get_picture.href;

        // set up next image button
        document.getElementById('left-arrow').onclick = function(e) {
            document.dispatchEvent(new CustomEvent('getImage', { 
                detail: image.actions.get_prev_image || image.actions.get_last_image 
            }));
        };
        // set up previous image button
        document.getElementById('right-arrow').onclick = function(e) {
            document.dispatchEvent(new CustomEvent('getImage', { 
                detail: image.actions.get_next_image || image.actions.get_first_image
            }));
        };

        // handles comment form submit
        document.getElementById('comment-form').onsubmit = function(e) {
            e.preventDefault();

            var data = {
                text: document.getElementById('comment-text').value
            };

            if (data.text.trim()) {
                document.getElementById('comment-form').reset();
                document.dispatchEvent(new CustomEvent('addComment', {
                    detail: { 
                        action: image.actions.add_comment, 
                        refreshCommentsAction: image.actions.get_comments,
                        comment: data 
                    }
                }));
            }
        };
    };

    // render the comments
    view.renderComments = function(data) {
        var comments = data.comments;

        var commentsElement = document.getElementById('comments');
        var commentsList = commentsElement.children[0];
        var pagination = commentsElement.children[1];
        commentsList.innerHTML = "";

        if (comments.length === 0) {
            // If no comments, don't show page numbers
            pagination.className = '';
            pagination.children[1].textContent = '';
            pagination.children[0].style.display = "none";
            pagination.children[2].style.display = "none";
            return;
        }

        comments.forEach(function(comment) {
            // Create the comments
            var dateString = comment.createdAt.toDateString();

            var el = document.createElement('div');
            el.id = comment.id;
            el.classList.add('comment');
            el.innerHTML = `
                <h3>${comment.author} said...</h3>
                <p>${comment.text}</p>
                <h5>${dateString}</h5>`;
            
            // Show delete button if allowed to delete
            if (comment.actions.delete_comment) {
                var deleteButton = document.createElement('span');
                deleteButton.className = 'icon trash-icon delete-comment';
                deleteButton.onclick = function() {
                    document.dispatchEvent(new CustomEvent('deleteComment', {
                        detail: {
                            action: comment.actions.delete_comment,
                            refreshCommentsAction: (comments.length === 1 && data.actions.get_prev_page) ? data.actions.get_prev_page : data.actions.get_current_page
                        }
                    }));
                };
                el.appendChild(deleteButton);
            }
            commentsList.appendChild(el);
        });

        // Show pagination and set up page change listeners
        pagination.className = 'pagination';

        if (data.page > 1) {
            pagination.children[0].style.display = "block";
        } else {
            pagination.children[0].style.display = "none";
        }
        pagination.children[1].textContent = 'Page ' + data.page;
        if (data.total_pages == data.page) {
            pagination.children[2].style.display = "none";
        } else {
            pagination.children[2].style.display = "block";
        }

        commentsElement.style.display = "block";

        // Event Listeners

        document.getElementById('previous-comment').onclick = function(e) {
            document.dispatchEvent(new CustomEvent('getComments', {
                detail: data.actions.get_prev_page || data.actions.get_last_page
            }));
        };

        document.getElementById('next-comment').onclick = function(e) {
            document.dispatchEvent(new CustomEvent('getComments', {
                detail: data.actions.get_next_page || data.actions.get_first_page
            }));
        };
    };


    // A generic error modal that will show errors
    // will generally never be shown unless something goes really wrong
    view.renderErrorModal = function(err) {
        var modal = document.getElementById('error-modal');
        modal.style.display = "block";
        modal.children[0].children[1].textContent = err.message;
    };

    document.getElementById('close-error-modal').onclick = function(e) {
        document.getElementById('error-modal').style.display = "none";
    };


    return view;
})();
