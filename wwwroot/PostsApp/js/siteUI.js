let posts = [];
let allPostsForCategories = []; 
let currentView = 'list'; 
let periodicRefreshInterval = null; 

let paginationManager = {
    limit: 5, 
    offset: 0, 
    isLoading: false, 
    hasMore: true, 
    scrollThreshold: 300 
};

$(document).ready(function () {
    $('#searchBarContainer').hide();
    
    loadAllPostsForCategories();
    
    loadPosts(true); 
    
    
    startPeriodicRefresh();
    
   
    setupInfiniteScroll();
    
    $('#addBtn').click(function() {
        showAddView();
    });
    
    $('#cancelAddBtn').click(function() {
        showListView();
    });
    
    $('#saveAddBtn').click(async function() {
        await savePost(true);
    });
    
    $('#cancelEditBtn').click(function() {
        showListView();
    });
    
    $('#saveEditBtn').click(async function() {
        await savePost(false);
    });
    
    $('#cancelDeleteBtn').click(function() {
        showListView();
    });
    
    $('#confirmDeleteBtn').click(async function() {
        await deletePost();
    });
    
    $(document).on('click', '.edit-btn', function(e) {
        e.stopPropagation();
        let postId = $(this).attr('data-post-id');
        
        if (postId) {
            postId = String(postId).trim();
            const postInList = posts.find(p => String(p.Id).trim() === postId);
            if (postInList) {
                const listId = String(postInList.Id).trim();
                const usedId = String(postId).trim();
                if (listId !== usedId) {
                    postId = listId;
                }
            } else {
                alert('Erreur: L\'ID du post n\'existe pas dans la liste. Veuillez recharger la page.');
                return;
            }
            
            if (postId && postId !== '' && postId !== 'undefined') {
                showEditView(postId);
            } else {
                alert('Erreur: ID du post invalide');
            }
        } else {
            alert('Erreur: ID du post introuvable');
        }
    });
    
    $(document).on('click', '.delete-btn', function(e) {
        e.stopPropagation();
        const postId = $(this).attr('data-post-id');
        if (postId) {
            showDeleteView(postId);
        } else {
            alert('Erreur: ID du post introuvable');
        }
    });
    
    $('#addImage').change(function(e) {
        handleImagePreview(e, 'addImagePreview', 'addImagePlaceholder');
    });
    
    $('#addImagePlaceholder').click(function() {
        $('#addImage').click();
    });
    
    $('#editImage').change(function(e) {
        handleImagePreview(e, 'editImagePreview', 'editImagePlaceholder');
    });
    
    $('#editImagePlaceholder').click(function() {
        $('#editImage').click();
    });
    
    $('#addImagePreview').click(function() {
        $('#addImage').click();
    });
    
    $('#editImagePreview').click(function() {
        $('#editImage').click();
    });
    
    setupDragAndDrop('addImagePlaceholder', 'addImagePreview', 'addImage');
    
    setupDragAndDrop('editImagePlaceholder', 'editImagePreview', 'editImage');
    

    

    $('#mainSearchBtn').on('click', function() {
        triggerMainSearch();
    });
    $('#mainSearchInput').on('keypress', function(e) {
        if (e.which === 13) triggerMainSearch();
    });

    $('#menuBtn').click(function(e) {
        e.stopPropagation();
        if ($('#categoryMenu').is(':visible')) {
            $('#categoryMenu').fadeOut(100);
        } else {
            showCategoryMenu();
        }
    });
    
    $('#aboutCloseBtn').click(function() {
        hideAboutModal();
    });
    
    $('#aboutModal').click(function(e) {
        if ($(e.target).is('#aboutModal')) {
            hideAboutModal();
        }
    });

});

function showListView() {
    currentView = 'list';
    $('#postsContainer').empty().show();
    $('#addView').hide();
    $('#editView').hide();
    $('#deleteView').hide();
    $('#loadingContainer').hide();
    $('#loadingMoreContainer').hide();
    
    if (currentSearchWords && currentSearchWords.length > 0) {
        applySearchFilter();
    } else if (selectedCategory && selectedCategory !== 'TOUT') {
        filterPostsByCategory(selectedCategory);
    } else {
        loadPosts(true); 
        setupInfiniteScroll(); 
    }
}

function startPeriodicRefresh() {
    if (periodicRefreshInterval) {
        clearInterval(periodicRefreshInterval);
    }
    
    periodicRefreshInterval = setInterval(async function() {
        if (currentView === 'list') {
            await checkAndRefreshIfNeeded();
        }
    }, 5000);
}


async function checkAndRefreshIfNeeded() {
    let scrollMaintainer = null;
    try {
        const newETag = await API_GetETag();
        const currentETag = API_getCurrentETag();
        
        if (newETag && currentETag && newETag !== currentETag) {
            const scrollInfo = saveScrollPosition();
            const savedScrollTop = $(window).scrollTop();
            const $firstPostBefore = $('.post-article').first();
            const firstPostTopBefore = $firstPostBefore.length > 0 ? $firstPostBefore.offset().top : 0;
            
            scrollMaintainer = setInterval(() => {
                $(window).scrollTop(savedScrollTop);
            }, 10);
            
            await refreshPostsWithoutScrollReset();
            
            if (scrollMaintainer) {
                clearInterval(scrollMaintainer);
                scrollMaintainer = null;
            }
            
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const $firstPostAfter = $('.post-article').first();
                    if ($firstPostAfter.length > 0 && $firstPostBefore.length > 0) {
                        const firstPostTopAfter = $firstPostAfter.offset().top;
                        const heightAdded = firstPostTopAfter - firstPostTopBefore;
                        
                        if (scrollInfo.anchorPostId) {
                            const $anchorPost = $(`.post-article[data-post-id="${scrollInfo.anchorPostId}"]`);
                            if ($anchorPost.length > 0) {
                                const newPostTop = $anchorPost.offset().top;
                                $(window).scrollTop(newPostTop + scrollInfo.anchorOffset);
                                return;
                            }
                        }
                        
                        const targetScroll = savedScrollTop + heightAdded;
                        $(window).scrollTop(targetScroll);
                    } else {
                        $(window).scrollTop(savedScrollTop);
                    }
                });
            });
        }
    } catch (error) {
        if (scrollMaintainer) {
            clearInterval(scrollMaintainer);
            scrollMaintainer = null;
        }
    }
}

function saveScrollPosition() {
    const scrollTop = $(window).scrollTop();
    const windowHeight = $(window).height();
    
    let anchorPostId = null;
    let anchorOffset = 0;
    
    $('.post-article').each(function() {
        const $post = $(this);
        const postTop = $post.offset().top;
        const postBottom = postTop + $post.outerHeight();
        const windowTop = scrollTop;
        const windowBottom = scrollTop + windowHeight;
        
        if (postTop <= windowBottom && postBottom >= windowTop) {
            if (!anchorPostId) {
                anchorPostId = $post.attr('data-post-id');
                anchorOffset = scrollTop - postTop;
            }
        }
    });
    
    return {
        scrollTop: scrollTop,
        anchorPostId: anchorPostId,
        anchorOffset: anchorOffset
    };
}

function restoreScrollPosition(scrollInfo, fallbackScroll) {
    const targetScroll = scrollInfo.scrollTop || fallbackScroll || 0;
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (scrollInfo.anchorPostId) {
                const $anchorPost = $(`.post-article[data-post-id="${scrollInfo.anchorPostId}"]`);
                if ($anchorPost.length > 0) {
                    const newPostTop = $anchorPost.offset().top;
                    const targetPosition = newPostTop + scrollInfo.anchorOffset;
                    $(window).scrollTop(targetPosition);
                    return;
                }
            }
            $(window).scrollTop(targetScroll);
        });
    });
}

async function refreshPostsWithoutScrollReset() {
    if (paginationManager.isLoading) {
        return;
    }
    
    paginationManager.isLoading = true;
    
    const currentPostIds = new Set(posts.map(p => String(p.Id).trim()));
    const allNewPosts = await API_GetPosts(null, null, null);
    
    if (allNewPosts && allNewPosts.length > 0) {
        allNewPosts.sort((a, b) => {
            const dateA = a.Creation || 0;
            const dateB = b.Creation || 0;
            return dateB - dateA;
        });
        
        const newPostIds = new Set(allNewPosts.map(p => String(p.Id).trim()));
        const postsToAdd = allNewPosts.filter(p => !currentPostIds.has(String(p.Id).trim()));
        const postsToUpdate = allNewPosts.filter(p => currentPostIds.has(String(p.Id).trim()));
        const postsToRemove = Array.from(currentPostIds).filter(id => !newPostIds.has(id));
        
        const $container = $('#postsContainer');
        const savedScrollTop = $(window).scrollTop();
        
        postsToRemove.forEach(postId => {
            $(`.post-article[data-post-id="${postId}"]`).remove();
            posts = posts.filter(p => String(p.Id).trim() !== postId);
            allPostsForCategories = allPostsForCategories.filter(p => String(p.Id).trim() !== postId);
            $(window).scrollTop(savedScrollTop);
        });
        
        postsToUpdate.forEach(updatedPost => {
            const postId = String(updatedPost.Id).trim();
            const existingIndex = posts.findIndex(p => String(p.Id).trim() === postId);
            if (existingIndex !== -1) {
                posts[existingIndex] = updatedPost;
            }
            const existingIndexAll = allPostsForCategories.findIndex(p => String(p.Id).trim() === postId);
            if (existingIndexAll !== -1) {
                allPostsForCategories[existingIndexAll] = updatedPost;
            }
            
            const $existingPost = $(`.post-article[data-post-id="${postId}"]`);
            if ($existingPost.length > 0) {
                const newHtml = createPostHtml(updatedPost);
                $existingPost.replaceWith(newHtml);
                $(window).scrollTop(savedScrollTop);
                
                const textLength = updatedPost.Text ? updatedPost.Text.length : 0;
                const shouldTruncate = textLength > 200;
                if (shouldTruncate) {
                    const postIdAttr = String(updatedPost.Id).trim();
                    $(`#postsContainer .post-read-more[data-post-id="${postIdAttr}"]`).off('click').on('click', function() {
                        const clickedPostId = $(this).attr('data-post-id');
                        const $textElement = $(`#postsContainer .post-text[data-post-id="${clickedPostId}"]`);
                        togglePostText($textElement, $(this));
                    });
                }
            }
        });
        
        if (postsToAdd.length > 0) {
            const $firstPost = $('.post-article').first();
            
            postsToAdd.forEach(newPost => {
                posts.unshift(newPost);
                allPostsForCategories.unshift(newPost);
                
                if ($firstPost.length > 0) {
                    $firstPost.before(createPostHtml(newPost));
                } else {
                    renderPost(newPost);
                }
                $(window).scrollTop(savedScrollTop);
            });
        }
        
        posts.sort((a, b) => {
            const dateA = a.Creation || 0;
            const dateB = b.Creation || 0;
            return dateB - dateA;
        });
    }
    
    paginationManager.isLoading = false;
}

function createPostHtml(post) {
    const postText = escapeHtml(post.Text || '');
    const postTitle = escapeHtml(post.Title || 'Sans titre');
    const textLength = post.Text ? post.Text.length : 0;
    const shouldTruncate = textLength > 200;
    
    if (!post.Id || post.Id === '' || post.Id === 'undefined') {
        return '';
    }
    
    const postId = String(post.Id).trim();
    const escapedPostId = escapeHtml(postId);
    
    let displayedTitle = postTitle;
    let displayedText = postText;
    if (currentSearchWords && currentSearchWords.length > 0) {
        displayedTitle = highlightWords(postTitle, currentSearchWords);
        displayedText = highlightWords(postText, currentSearchWords);
    }
    
    return `
        <div class="post-article" data-post-id="${escapedPostId}">
            <div class="post-actions">
                <i class="fa fa-pencil post-action-btn edit-btn" data-post-id="${escapedPostId}" title="Modifier"></i>
                <i class="fa fa-trash post-action-btn delete-btn" data-post-id="${escapedPostId}" title="Supprimer"></i>
            </div>
            <div class="post-category">${escapeHtml(post.Category || 'GÉNÉRAL')}</div>
            <h2 class="post-title">${displayedTitle}</h2>
            ${post.Image ? `<img src="${post.Image}" alt="${escapeHtml(post.Title)}" class="post-image" onerror="this.style.display='none'">` : ''}
            <div class="post-date">${post.Creation ? convertToFrenchDate(post.Creation) : ''}</div>
            <div class="post-text ${shouldTruncate ? 'hideExtra' : ''}" data-post-id="${escapedPostId}">${displayedText}</div>
            ${shouldTruncate ? `
            <div class="post-read-more" data-post-id="${escapedPostId}">
                <i class="fa fa-chevron-down"></i>
            </div>
            ` : ''}
        </div>
    `;
}

function setupInfiniteScroll() {
    $(window).off('scroll.pagination');
    
    let scrollTimeout = null;
    $(window).on('scroll.pagination', async function() {
        if (currentView !== 'list') {
            return;
        }
        
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        scrollTimeout = setTimeout(async function() {
            const scrollTop = $(window).scrollTop() || $(document).scrollTop();
            const windowHeight = $(window).height();
            const documentHeight = $(document).height() || document.body.scrollHeight;
            const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
            const isNearBottom = distanceFromBottom <= paginationManager.scrollThreshold || distanceFromBottom < 0;
            
            if (isNearBottom && paginationManager.hasMore && !paginationManager.isLoading) {
                await loadPosts(false);
            }
        }, 100);
    });
}

function stopInfiniteScroll() {
    $(window).off('scroll.pagination');
}

function showAddView() {
    currentView = 'add';
    $('#postsContainer').hide();
    $('#addView').show();
    $('#editView').hide();
    $('#deleteView').hide();
    $('#loadingContainer').hide();
    
    $('#addForm')[0].reset();
    $('#addImagePreview').hide();
    $('#addImagePlaceholder').show();
    $('#addImage').val('');
}

function showEditView(postId) {
    currentView = 'edit';
    $('#postsContainer').hide();
    $('#addView').hide();
    $('#editView').show();
    $('#deleteView').hide();
    $('#loadingContainer').hide();
    $('#searchBarContainer').slideUp(180);
    
    if (!postId || postId === '' || postId === 'undefined') {
        alert('Erreur: ID du post invalide pour la modification');
        showListView();
        return;
    }
    
    $('#editForm')[0].reset();
    $('#editId').val(postId);
    $('#editId').removeAttr('data-original-creation');
    $('#editImagePreview').hide();
    $('#editImagePlaceholder').show();
    $('#editImage').val('');
    
    loadPostForEdit(postId);
}

function showDeleteView(postId) {
    currentView = 'delete';
    $('#postsContainer').hide();
    $('#addView').hide();
    $('#editView').hide();
    $('#deleteView').show();
    $('#loadingContainer').hide();
    
    loadPostForDelete(postId);
}

async function loadPostForEdit(postId) {
    if (!postId) {
        alert('Erreur: ID du post manquant');
        return;
    }
    
    postId = String(postId).trim();
    $('#loadingContainer').show();
    
    let post = await API_GetPost(postId);
    
    if (!post) {
        const postInList = posts.find(p => String(p.Id).trim() === postId);
        if (postInList) {
            post = postInList;
        }
    }
    
    $('#loadingContainer').hide();
    
    if (post) {
        if (!post.Id || post.Id === '' || post.Id === 'undefined') {
            alert('Erreur: Le post chargé n\'a pas d\'ID valide');
            showListView();
            return;
        }
        
        const postIdString = String(post.Id).trim();
        $('#editId').val(postIdString);
        $('#editCategory').val(post.Category || '');
        $('#editTitle').val(post.Title || '');
        $('#editText').val(post.Text || '');
        $('#keepCreationDate').prop('checked', true);
        
        if (post.Creation) {
            $('#editId').attr('data-original-creation', String(post.Creation));
        } else {
            $('#editId').removeAttr('data-original-creation');
        }
        
        if (post.Image) {
            let imageUrl = post.Image;
            if (post.Image.indexOf('data:') !== 0 && post.Image.indexOf('http') !== 0) {
                imageUrl = 'http://localhost:5000/assetsRepository/' + post.Image;
            }
            $('#editImagePreview').attr('src', imageUrl).show();
            $('#editImagePlaceholder').hide();
        } else {
            $('#editImagePreview').hide();
            $('#editImagePlaceholder').show();
        }
        $('#editImage').val('');
    } else {
        const errorMsg = API_getcurrentHttpError() || 'Erreur inconnue';
        alert('Erreur: Impossible de charger le post pour modification\n' + errorMsg);
        showListView();
    }
}

async function loadPostForDelete(postId) {
    $('#loadingContainer').show();
    const post = await API_GetPost(postId);
    $('#loadingContainer').hide();
    
    if (post) {
        const deleteHtml = `
            <div class="post-article">
                <div class="post-category">${escapeHtml(post.Category || 'GÉNÉRAL')}</div>
                <h2 class="post-title">${escapeHtml(post.Title || 'Sans titre')}</h2>
                ${post.Image ? `<img src="${post.Image}" alt="${escapeHtml(post.Title)}" class="post-image" onerror="this.style.display='none'">` : ''}
                <div class="post-date">${post.Creation ? convertToFrenchDate(post.Creation) : ''}</div>
                <div class="post-text">${escapeHtml(post.Text || '')}</div>
            </div>
        `;
        $('#deletePostContent').html(deleteHtml);
        $('#deletePostContent').attr('data-post-id', postId);
    }
}

function handleImagePreview(event, previewId, placeholderId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            $('#' + previewId).attr('src', e.target.result).show();
            $('#' + placeholderId).hide();
        };
        reader.readAsDataURL(file);
    }
}

function setupDragAndDrop(placeholderId, previewId, inputId) {
    const $placeholder = $('#' + placeholderId);
    const $preview = $('#' + previewId);
    const $container = $placeholder.parent();
    
    $container.on('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $placeholder.css('border-color', '#4A90E2');
        $placeholder.css('background', 'linear-gradient(135deg, #e8f4fd 0%, #d0e8f5 100%)');
    });
    
    $container.on('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $placeholder.css('border-color', '#ccc');
        $placeholder.css('background', 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)');
    });
    
    $container.on('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        $placeholder.css('border-color', '#ccc');
        $placeholder.css('background', 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)');
        
        const files = e.originalEvent.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            
            if (file.type && file.type.indexOf('image') === 0) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                const input = document.getElementById(inputId);
                input.files = dataTransfer.files;
                $(input).trigger('change');
            } else {
                alert('Veuillez déposer une image valide');
            }
        }
    });
    
    $placeholder.on('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).css('border-color', '#4A90E2');
        $(this).css('background', 'linear-gradient(135deg, #e8f4fd 0%, #d0e8f5 100%)');
    });
    
    $placeholder.on('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).css('border-color', '#ccc');
        $(this).css('background', 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)');
    });
    
    $placeholder.on('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        $(this).css('border-color', '#ccc');
        $(this).css('background', 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)');
        
        const files = e.originalEvent.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            
            if (file.type && file.type.indexOf('image') === 0) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                const input = document.getElementById(inputId);
                input.files = dataTransfer.files;
                $(input).trigger('change');
            } else {
                alert('Veuillez déposer une image valide');
            }
        }
    });
    
    $preview.on('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
    });
    
    $preview.on('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const files = e.originalEvent.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            
            if (file.type && file.type.indexOf('image') === 0) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                const input = document.getElementById(inputId);
                input.files = dataTransfer.files;
                $(input).trigger('change');
            } else {
                alert('Veuillez déposer une image valide');
            }
        }
    });
}

async function savePost(isNew) {
    const formId = isNew ? 'addForm' : 'editForm';
    const form = $('#' + formId)[0];
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    let postId = null;
    if (!isNew) {
        postId = $('#editId').val();
        if (!postId || postId === '' || postId === 'undefined') {
            alert('Erreur: ID du post introuvable pour la modification. Veuillez recharger la page.');
            return;
        }
        postId = String(postId).trim();
    }
    
    const post = {
        Category: $('#' + (isNew ? 'add' : 'edit') + 'Category').val() || '',
        Title: $('#' + (isNew ? 'add' : 'edit') + 'Title').val() || '',
        Text: $('#' + (isNew ? 'add' : 'edit') + 'Text').val() || '',
        Image: ''
    };
    
    if (!isNew && postId) {
        post.Id = postId;
    }
    
    const imageInput = $('#' + (isNew ? 'add' : 'edit') + 'Image')[0];
    const imagePreview = $('#' + (isNew ? 'add' : 'edit') + 'ImagePreview');
    
    if (imageInput && imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            post.Image = e.target.result || '';
            await savePostData(post, isNew);
        };
        reader.onerror = async function() {
            post.Image = '';
            await savePostData(post, isNew);
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else if (!isNew && imagePreview.is(':visible') && imagePreview.attr('src')) {
        const src = imagePreview.attr('src');
        if (src.indexOf('data:image') === 0) {
            post.Image = src;
        } else if (src.indexOf('http://localhost:5000/assetsRepository/') === 0) {
            post.Image = src.replace('http://localhost:5000/assetsRepository/', '');
        } else {
            post.Image = src;
        }
        await savePostData(post, isNew);
    } else {
        post.Image = '';
        await savePostData(post, isNew);
    }
}

async function savePostData(post, isNew) {
    if (!isNew) {
        if (!post.Id || post.Id === '' || post.Id === 'undefined') {
            const editId = $('#editId').val();
            
            if (!editId || editId === '' || editId === 'undefined') {
                alert('Erreur: ID du post introuvable pour la modification. Veuillez recharger la page.');
                return;
            }
            
            post.Id = String(editId).trim();
        }
        
        post.Id = String(post.Id).trim();
        
        const keepCreationDate = $('#keepCreationDate').prop('checked');
        
        if (keepCreationDate) {
            const originalCreation = $('#editId').attr('data-original-creation');
            if (originalCreation && originalCreation !== '' && originalCreation !== 'undefined') {
                const creationValue = parseInt(originalCreation);
                if (!isNaN(creationValue)) {
                    post.Creation = creationValue;
                }
            }
        } else {
            post.Creation = Math.floor(Date.now() / 1000);
        }
    } else {
        post.Creation = Math.floor(Date.now() / 1000);
    }
    
    if (!post.Category) post.Category = '';
    if (!post.Title) post.Title = '';
    if (!post.Text) post.Text = '';
    if (!post.Image) post.Image = '';
    
    $('#loadingContainer').show();
    const savedPost = await API_SavePost(post, isNew);
    $('#loadingContainer').hide();
    
    if (savedPost) {
        if (!isNew) {
            if (savedPost.Id) {
                const savedId = String(savedPost.Id).trim();
                const originalId = String(post.Id).trim();
                
                let finalPost = savedPost;
                
                if (savedId !== originalId) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                    const refreshedPost = await API_GetPost(originalId);
                    if (refreshedPost) {
                        finalPost = refreshedPost;
                    }
                }
                
                const finalId = String(finalPost.Id).trim();
                $('#editId').val(finalId);
                if (finalPost.Creation) {
                    $('#editId').attr('data-original-creation', String(finalPost.Creation));
                }
                
                const postIndex = posts.findIndex(p => String(p.Id).trim() === finalId);
                if (postIndex !== -1) {
                    posts[postIndex] = finalPost;
                } else {
                    posts.unshift(finalPost);
                }
                
                const allPostIndex = allPostsForCategories.findIndex(p => String(p.Id).trim() === finalId);
                if (allPostIndex !== -1) {
                    allPostsForCategories[allPostIndex] = finalPost;
                } else {
                    allPostsForCategories.unshift(finalPost);
                }
                
                await new Promise(resolve => setTimeout(resolve, 500));
                await loadPosts(true);
                showListView();
            } else {
                alert('Erreur: Aucun ID retourné par le serveur après la modification. Veuillez recharger la page.');
                return;
            }
        } else {
            if (savedPost.Id) {
                const savedId = String(savedPost.Id).trim();
                await new Promise(resolve => setTimeout(resolve, 300));
                const refreshedPost = await API_GetPost(savedId);
                if (refreshedPost) {
                    posts.unshift(refreshedPost);
                    allPostsForCategories.unshift(refreshedPost);
                } else {
                    posts.unshift(savedPost);
                    allPostsForCategories.unshift(savedPost);
                }
            }
            await new Promise(resolve => setTimeout(resolve, 500));
            await loadPosts(true);
            showListView();
        }
    } else {
        const errorMsg = API_getcurrentHttpError() || 'Erreur inconnue';
        alert('Erreur lors de la sauvegarde:\n' + errorMsg);
    }
}

async function deletePost() {
    const postId = $('#deletePostContent').attr('data-post-id');
    
    if (!postId) {
        alert('Erreur: ID du post introuvable');
        return;
    }
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
        return;
    }
    
    $('#loadingContainer').show();
    const success = await API_DeletePost(postId);
    $('#loadingContainer').hide();
    
    if (success) {
        showListView();
    } else {
        const errorMsg = API_getcurrentHttpError() || 'Erreur inconnue';
        alert('Erreur lors de la suppression:\n' + errorMsg);
    }
}


async function loadPosts(reset = false) {
    if (paginationManager.isLoading) {
        return;
    }
    
    if (reset) {
        paginationManager.offset = 0;
        paginationManager.hasMore = true;
        posts = [];
        $('#postsContainer').empty();
    }
    
    if (!paginationManager.hasMore) {
        return;
    }
    
    paginationManager.isLoading = true;
    
    if (paginationManager.offset === 0) {
        $('#loadingContainer').show();
        $('#loadingMoreContainer').hide();
    } else {
        $('#loadingContainer').hide();
        $('#loadingMoreContainer').show();
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const newPosts = await API_GetPosts(paginationManager.limit, paginationManager.offset, null);
    
    $('#loadingContainer').hide();
    $('#loadingMoreContainer').hide();
    
    if (newPosts && newPosts.length > 0) {
        newPosts.sort((a, b) => {
            const dateA = a.Creation || 0;
            const dateB = b.Creation || 0;
            return dateB - dateA;
        });
        
        if (reset) {
            posts = newPosts;
        } else {
            const existingIds = new Set(posts.map(p => String(p.Id).trim()));
            const uniqueNewPosts = newPosts.filter(p => !existingIds.has(String(p.Id).trim()));
            posts = posts.concat(uniqueNewPosts);
        }
        
        posts.sort((a, b) => {
            const dateA = a.Creation || 0;
            const dateB = b.Creation || 0;
            return dateB - dateA;
        });
        
        if (reset) {
            posts.forEach(post => {
                renderPost(post);
            });
        } else {
            newPosts.forEach(post => {
                renderPost(post);
            });
        }
        
        if (newPosts.length < paginationManager.limit) {
            paginationManager.hasMore = false;
        } else {
            paginationManager.offset += 1;
        }
    } else {
        paginationManager.hasMore = false;
        
        if (paginationManager.offset === 0) {
            showEmptyState();
        }
    }
    
    paginationManager.isLoading = false;
}

function highlightWords(text, words) {
    if (!text || !words || words.length === 0) return text;
    let result = text;
    words.forEach(word => {
        if (word.length > 0) {
            const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            result = result.replace(regex, '<span class="highlight-search">$1</span>');
        }
    });
    return result;
}

function renderPost(post) {
    const postText = escapeHtml(post.Text || '');
    const postTitle = escapeHtml(post.Title || 'Sans titre');
    const textLength = post.Text ? post.Text.length : 0;
    const shouldTruncate = textLength > 200;
    
    if (!post.Id || post.Id === '' || post.Id === 'undefined') {
        return;
    }
    
    const postId = String(post.Id).trim();
    const escapedPostId = escapeHtml(postId);
    
    let displayedTitle = postTitle;
    let displayedText = postText;
    if (currentSearchWords && currentSearchWords.length > 0) {
        displayedTitle = highlightWords(postTitle, currentSearchWords);
        displayedText = highlightWords(postText, currentSearchWords);
    }
    
    const postHtml = `
        <div class="post-article" data-post-id="${escapedPostId}">
            <div class="post-actions">
                <i class="fa fa-pencil post-action-btn edit-btn" data-post-id="${escapedPostId}" title="Modifier"></i>
                <i class="fa fa-trash post-action-btn delete-btn" data-post-id="${escapedPostId}" title="Supprimer"></i>
            </div>
            <div class="post-category">${escapeHtml(post.Category || 'GÉNÉRAL')}</div>
            <h2 class="post-title">${displayedTitle}</h2>
            ${post.Image ? `<img src="${post.Image}" alt="${escapeHtml(post.Title)}" class="post-image" onerror="this.style.display='none'">` : ''}
            <div class="post-date">${post.Creation ? convertToFrenchDate(post.Creation) : ''}</div>
            <div class="post-text ${shouldTruncate ? 'hideExtra' : ''}" data-post-id="${escapedPostId}">${displayedText}</div>
            ${shouldTruncate ? `
            <div class="post-read-more" data-post-id="${escapedPostId}">
                <i class="fa fa-chevron-down"></i>
            </div>
            ` : ''}
        </div>
    `;
    
    $('#postsContainer').append(postHtml);
    
    if (shouldTruncate) {
        $(`#postsContainer .post-read-more[data-post-id="${escapedPostId}"]`).off('click').on('click', function() {
            const postId = $(this).attr('data-post-id');
            const $textElement = $(`#postsContainer .post-text[data-post-id="${postId}"]`);
            togglePostText($textElement, $(this));
        });
    }
}

function togglePostText($textElement, $readMore) {
    const $icon = $readMore.find('i');
    
    if ($textElement.hasClass('hideExtra')) {
        $textElement.removeClass('hideExtra').addClass('showExtra');
        $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    } else {
        $textElement.removeClass('showExtra').addClass('hideExtra');
        $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
        
        $('html, body').animate({
            scrollTop: $textElement.offset().top - 100
        }, 300);
    }
}

function showEmptyState() {
    const emptyHtml = `
        <div class="empty-state">
            <i class="fa fa-newspaper"></i>
            <p>Aucun article disponible</p>
        </div>
    `;
    $('#postsContainer').append(emptyHtml);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getAllCategories() {
    const sourcePosts = allPostsForCategories.length > 0 ? allPostsForCategories : posts;
    const cats = sourcePosts.map(p => p.Category && p.Category.trim() ? p.Category.trim() : 'GÉNÉRAL');
    return Array.from(new Set(cats)).sort();
}

let selectedCategory = 'TOUT';

function createCategoryMenu() {
    if ($('#categoryMenu').length === 0) {
        $('body').append(`
            <div id="categoryMenu" class="category-menu">
            </div>
        `);
    }
}

function showCategoryMenu() {
    createCategoryMenu();
    const categories = getAllCategories();
    
    let html = '';
    
    const allSelected = selectedCategory === 'TOUT' ? 'selected' : '';
    html += `<div class="cat-item ${allSelected}" data-cat="TOUT">
        ${selectedCategory === 'TOUT' ? '<i class="fa fa-check cat-check"></i>' : '<span class="cat-check-placeholder"></span>'}
        <span class="cat-label">Toutes les catégories</span>
    </div>`;
    
    html += `<div class="cat-separator"></div>`;
    
    categories.forEach(cat => {
        const isSelected = selectedCategory === cat;
        html += `<div class="cat-item ${isSelected ? 'selected' : ''}" data-cat="${escapeHtml(cat)}">
            ${isSelected ? '<i class="fa fa-check cat-check"></i>' : '<span class="cat-check-placeholder"></span>'}
            <span class="cat-label">${escapeHtml(cat)}</span>
        </div>`;
    });
    
    html += `<div class="cat-separator"></div>`;
    
    html += `<div class="cat-item cat-about" data-cat="ABOUT">
        <i class="fa fa-circle-info cat-info"></i>
        <span class="cat-label">À propos...</span>
    </div>`;
    
    $('#categoryMenu').html(html);

    const btn = $('#menuBtn')[0];
    const rect = btn.getBoundingClientRect();
    $('#categoryMenu').css({
        left: rect.right - 200 + window.scrollX,
        top: rect.bottom + window.scrollY + 4
    }).fadeIn(120);
}

$(document).on('mousedown', function(e){
    if ($('#categoryMenu').is(':visible') && !$(e.target).closest('#categoryMenu, #menuBtn').length){
        $('#categoryMenu').fadeOut(100);
    }
});

$(document).on('click', '.cat-item', async function(){
    const cat = $(this).data('cat');
    
    if (cat === 'ABOUT') {
        $('#categoryMenu').fadeOut(100);
        showAboutModal();
        return;
    }
    
    if (selectedCategory === cat) {
        selectedCategory = 'TOUT';
        $('#categoryMenu').fadeOut(100);
        
        currentSearchWords = [];
        $('#mainSearchInput').val('');
        $('#searchBarContainer').slideUp(180);
        
        loadPosts(true);
        setupInfiniteScroll();
        return;
    }
    
    selectedCategory = cat;
    
    $('#categoryMenu').fadeOut(100);
    
    currentSearchWords = [];
    $('#mainSearchInput').val('');
    $('#searchBarContainer').slideUp(180);
    
    stopInfiniteScroll();
    
    await filterPostsByCategory(cat);
});

async function loadAllPostsForCategories() {
    try {
        const allPosts = await API_GetPosts(null, null, null);
        if (allPosts && allPosts.length > 0) {
            allPostsForCategories = allPosts;
        }
    } catch (error) {
        allPostsForCategories = [...posts];
    }
}

function showAboutModal() {
    $('#aboutModal').fadeIn(200);
}

function hideAboutModal() {
    $('#aboutModal').fadeOut(200);
}

async function filterPostsByCategory(category) {
    $('#postsContainer').empty();
    $('#loadingContainer').show();
    
    try {
        const allPosts = await API_GetPosts(null, null, category);
        
        $('#loadingContainer').hide();
        
        if (allPosts && allPosts.length > 0) {
            const sortedPosts = [...allPosts].sort((a, b) => {
                const dateA = a.Creation || 0;
                const dateB = b.Creation || 0;
                return dateB - dateA;
            });
            
            posts = sortedPosts;
            
            sortedPosts.forEach(post => renderPost(post));
        } else {
            showEmptyState();
        }
    } catch (error) {
        $('#loadingContainer').hide();
        alert('Erreur lors du chargement des posts de cette catégorie.');
    }
}

$('#closeSearchBtn').on('click', function() {
    $('#searchBarContainer').slideUp(180, function() {
        $(this).css('display', 'none');
    });
    $('#mainSearchInput').val('');
    currentSearchWords = [];
    showListView(); // Affiche tous les posts sans filtre ni surbrillance
});
let currentSearchWords = []; 

$('#searchBtn').off('click').on('click', function() {
    if ($('#searchBarContainer').is(':visible')) {
        $('#searchBarContainer').slideUp(180, function() {
            $(this).css('display', 'none');
        });
        $('#mainSearchInput').blur();
    } else {
        $('#searchBarContainer').css('display', 'flex').hide().slideDown(180);
        $('#mainSearchInput').focus();
        if (currentSearchWords.length > 0) {
            $('#mainSearchInput').val(currentSearchWords.join(' '));
        }
    }
});

function applySearchFilter() {
    if (!currentSearchWords || currentSearchWords.length === 0) {
        loadPosts(true);
        setupInfiniteScroll();
        return;
    }

    const sourcePosts = allPostsForCategories.length > 0 ? allPostsForCategories : posts;
    
    const filtered = sourcePosts.filter(post => {
        const content = ((post.Title || '') + ' ' + (post.Text || '') + ' ' + (post.Category || '')).toLowerCase();
        return currentSearchWords.every(word => content.includes(word));
    });

    filtered.sort((a, b) => {
        const dateA = a.Creation || 0;
        const dateB = b.Creation || 0;
        return dateB - dateA;
    });

    $('#postsContainer').empty();
    stopInfiniteScroll();
    
    if (filtered.length > 0) {
        filtered.forEach(post => renderPost(post));
    } else {
        $('#postsContainer').append(`
            <div class="empty-state">
                <i class="fa fa-search"></i>
                <p>Aucun article ne correspond à votre recherche.</p>
            </div>
        `);
    }
}

async function triggerMainSearch() {
    const search = $('#mainSearchInput').val();
    if (!search || !search.trim()) {
        currentSearchWords = [];
        loadPosts(true);
        setupInfiniteScroll();
        return;
    }

    currentSearchWords = search.trim().toLowerCase().split(/\s+/);
    
    if (allPostsForCategories.length === 0) {
        await loadAllPostsForCategories();
    }
    
    applySearchFilter();
}