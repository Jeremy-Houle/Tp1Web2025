let posts = [];
let currentView = 'list'; // 'list', 'add', 'edit', 'delete'

$(document).ready(function () {
    loadPosts();
    
    // Bouton Ajout
    $('#addBtn').click(function() {
        showAddView();
    });
    
    // Bouton Annuler Ajout
    $('#cancelAddBtn').click(function() {
        showListView();
    });
    
    // Bouton Sauvegarder Ajout
    $('#saveAddBtn').click(async function() {
        await savePost(true);
    });
    
    // Bouton Annuler Modification
    $('#cancelEditBtn').click(function() {
        showListView();
    });
    
    // Bouton Sauvegarder Modification
    $('#saveEditBtn').click(async function() {
        await savePost(false);
    });
    
    // Bouton Annuler Retrait
    $('#cancelDeleteBtn').click(function() {
        showListView();
    });
    
    // Bouton Confirmer Retrait
    $('#confirmDeleteBtn').click(async function() {
        await deletePost();
    });
    
    // Délégation d'événements pour les boutons d'action (fonctionne même après rechargement)
    $(document).on('click', '.edit-btn', function(e) {
        e.stopPropagation();
        const postId = $(this).attr('data-post-id');
        console.log('Clic sur bouton modifier - Post ID:', postId);
        if (postId) {
            showEditView(postId);
        } else {
            alert('Erreur: ID du post introuvable');
        }
    });
    
    $(document).on('click', '.delete-btn', function(e) {
        e.stopPropagation();
        const postId = $(this).attr('data-post-id');
        console.log('Clic sur bouton supprimer - Post ID:', postId);
        if (postId) {
            showDeleteView(postId);
        } else {
            alert('Erreur: ID du post introuvable');
        }
    });
    
    // Gestion de l'upload d'image pour Ajout
    $('#addImage').change(function(e) {
        handleImagePreview(e, 'addImagePreview', 'addImagePlaceholder');
    });
    
    // Clic sur le placeholder pour déclencher l'upload
    $('#addImagePlaceholder').click(function() {
        $('#addImage').click();
    });
    
    // Gestion de l'upload d'image pour Modification
    $('#editImage').change(function(e) {
        handleImagePreview(e, 'editImagePreview', 'editImagePlaceholder');
    });
    
    // Clic sur le placeholder pour déclencher l'upload
    $('#editImagePlaceholder').click(function() {
        $('#editImage').click();
    });
    
    // Clic sur l'aperçu pour changer l'image
    $('#addImagePreview').click(function() {
        $('#addImage').click();
    });
    
    $('#editImagePreview').click(function() {
        $('#editImage').click();
    });
    
    // Drag and Drop pour Ajout
    setupDragAndDrop('addImagePlaceholder', 'addImagePreview', 'addImage');
    
    // Drag and Drop pour Modification
    setupDragAndDrop('editImagePlaceholder', 'editImagePreview', 'editImage');
    
    $('#searchBtn').click(function() {
        // TODO: Implémenter la recherche
        alert('Fonctionnalité de recherche à venir');
    });
    
    $('#menuBtn').click(function() {
        // TODO: Implémenter le menu
        alert('Menu à venir');
    });
});

// Afficher la vue liste
function showListView() {
    console.log('showListView - Affichage de la vue liste');
    currentView = 'list';
    $('#postsContainer').empty().show();
    $('#addView').hide();
    $('#editView').hide();
    $('#deleteView').hide();
    $('#loadingContainer').hide();
    loadPosts();
}

// Afficher la vue ajout
function showAddView() {
    currentView = 'add';
    $('#postsContainer').hide();
    $('#addView').show();
    $('#editView').hide();
    $('#deleteView').hide();
    $('#loadingContainer').hide();
    
    // Réinitialiser le formulaire
    $('#addForm')[0].reset();
    $('#addImagePreview').hide();
    $('#addImagePlaceholder').show();
    $('#addImage').val('');
}

// Afficher la vue modification
function showEditView(postId) {
    currentView = 'edit';
    $('#postsContainer').hide();
    $('#addView').hide();
    $('#editView').show();
    $('#deleteView').hide();
    $('#loadingContainer').hide();
    
    // Réinitialiser le formulaire avant de charger
    $('#editForm')[0].reset();
    $('#editId').val('');
    $('#editId').removeAttr('data-original-creation');
    $('#editImagePreview').hide();
    $('#editImagePlaceholder').show();
    $('#editImage').val('');
    
    // Charger le post depuis le serveur
    loadPostForEdit(postId);
}

// Afficher la vue retrait
function showDeleteView(postId) {
    currentView = 'delete';
    $('#postsContainer').hide();
    $('#addView').hide();
    $('#editView').hide();
    $('#deleteView').show();
    $('#loadingContainer').hide();
    
    // Charger le post
    loadPostForDelete(postId);
}

// Charger un post pour modification
async function loadPostForEdit(postId) {
    if (!postId) {
        console.error('loadPostForEdit - PostId manquant');
        alert('Erreur: ID du post manquant');
        return;
    }
    
    console.log('loadPostForEdit - Chargement du post ID:', postId);
    
    $('#loadingContainer').show();
    const post = await API_GetPost(postId);
    $('#loadingContainer').hide();
    
    if (post) {
        console.log('loadPostForEdit - Post chargé:', post.Id);
        console.log('loadPostForEdit - Post complet:', post);
        
        // S'assurer que l'ID est bien défini
        if (!post.Id) {
            console.error('loadPostForEdit - Post sans ID');
            alert('Erreur: Le post chargé n\'a pas d\'ID');
            return;
        }
        
        // Vérifier que l'ID correspond à celui demandé
        if (post.Id !== postId) {
            console.warn('loadPostForEdit - ID différent:', 'demandé:', postId, 'reçu:', post.Id);
        }
        
        // Stocker l'ID dans le champ caché
        $('#editId').val(post.Id);
        $('#editCategory').val(post.Category || '');
        $('#editTitle').val(post.Title || '');
        $('#editText').val(post.Text || '');
        $('#keepCreationDate').prop('checked', true);
        
        // Stocker la date de création originale dans un attribut data
        $('#editId').attr('data-original-creation', post.Creation || '');
        
        console.log('loadPostForEdit - ID stocké dans #editId:', $('#editId').val());
        console.log('loadPostForEdit - Date de création stockée:', $('#editId').attr('data-original-creation'));
        
        // Gérer l'image - construire l'URL complète si c'est un nom de fichier
        if (post.Image) {
            // Si l'image est un nom de fichier (pas une data URL), construire l'URL complète
            let imageUrl = post.Image;
            if (post.Image.indexOf('data:') !== 0 && post.Image.indexOf('http') !== 0) {
                // C'est probablement un nom de fichier, construire l'URL
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
        console.error('loadPostForEdit - Impossible de charger le post');
        const errorMsg = API_getcurrentHttpError() || 'Erreur inconnue';
        alert('Erreur: Impossible de charger le post pour modification\n' + errorMsg);
    }
}

// Charger un post pour suppression
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

// Gérer la prévisualisation d'image
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

// Configurer le drag and drop pour un champ image
function setupDragAndDrop(placeholderId, previewId, inputId) {
    const $placeholder = $('#' + placeholderId);
    const $preview = $('#' + previewId);
    const $container = $placeholder.parent();
    
    // Empêcher le comportement par défaut du navigateur
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
            
            // Vérifier que c'est une image
            if (file.type && file.type.indexOf('image') === 0) {
                // Créer un FileList simulé pour l'input
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                const input = document.getElementById(inputId);
                input.files = dataTransfer.files;
                
                // Déclencher l'événement change pour utiliser la fonction existante
                $(input).trigger('change');
            } else {
                alert('Veuillez déposer une image valide');
            }
        }
    });
    
    // Aussi sur le placeholder et l'aperçu
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
    
    // Sur l'aperçu aussi
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

// Sauvegarder un post (ajout ou modification)
async function savePost(isNew) {
    const formId = isNew ? 'addForm' : 'editForm';
    const form = $('#' + formId)[0];
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const post = {
        Category: $('#' + (isNew ? 'add' : 'edit') + 'Category').val() || '',
        Title: $('#' + (isNew ? 'add' : 'edit') + 'Title').val() || '',
        Text: $('#' + (isNew ? 'add' : 'edit') + 'Text').val() || '',
        Image: ''
    };
    
    // Gérer l'image
    const imageInput = $('#' + (isNew ? 'add' : 'edit') + 'Image')[0];
    const imagePreview = $('#' + (isNew ? 'add' : 'edit') + 'ImagePreview');
    
    if (imageInput && imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            post.Image = e.target.result || '';
            await savePostData(post, isNew);
        };
        reader.onerror = async function() {
            console.error('Erreur lors de la lecture de l\'image');
            post.Image = '';
            await savePostData(post, isNew);
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else if (!isNew && imagePreview.is(':visible') && imagePreview.attr('src')) {
        // En modification, conserver l'image existante si elle n'a pas été changée
        const src = imagePreview.attr('src');
        // Si c'est une data URL (nouvelle image), l'utiliser
        if (src.indexOf('data:image') === 0) {
            post.Image = src;
        } else if (src.indexOf('http://localhost:5000/assetsRepository/') === 0) {
            // C'est une URL complète, extraire le nom de fichier
            post.Image = src.replace('http://localhost:5000/assetsRepository/', '');
        } else {
            // C'est déjà un nom de fichier, le conserver
            post.Image = src;
        }
        await savePostData(post, isNew);
    } else {
        // Pas d'image, envoyer une chaîne vide
        post.Image = '';
        await savePostData(post, isNew);
    }
}

// Sauvegarder les données du post
async function savePostData(post, isNew) {
    if (!isNew) {
        // MODIFICATION
        // Récupérer l'ID depuis le champ caché
        const editId = $('#editId').val();
        console.log('savePostData - Modification - ID depuis champ:', editId);
        console.log('savePostData - Modification - ID dans post:', post.Id);
        
        // Utiliser l'ID du champ caché si disponible, sinon celui du post
        post.Id = editId || post.Id;
        
        console.log('savePostData - Modification - Post ID final:', post.Id);
        console.log('savePostData - Modification - Type de ID:', typeof post.Id);
        
        if (!post.Id || post.Id === '') {
            alert('Erreur: ID du post introuvable pour la modification');
            console.error('savePostData - ID manquant ou vide, impossible de continuer');
            return;
        }
        
        // Vérifier que le post existe avant de le modifier
        console.log('savePostData - Vérification de l\'existence du post avec ID:', post.Id);
        console.log('savePostData - Type de ID:', typeof post.Id);
        
        // Attendre un peu pour que le cache serveur soit mis à jour si c'est une modification rapide
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const existingPost = await API_GetPost(post.Id);
        if (!existingPost) {
            // Le post n'existe plus, peut-être que l'ID a changé ou le post a été supprimé
            // Recharger la liste pour voir les posts actuels
            console.error('savePostData - Post introuvable avec ID:', post.Id);
            console.log('savePostData - Rechargement de la liste des posts...');
            
            // Recharger tous les posts pour voir si l'ID existe encore
            const allPosts = await API_GetPosts();
            if (allPosts) {
                const foundPost = allPosts.find(p => p.Id === post.Id);
                if (!foundPost) {
                    alert('Erreur: Le post n\'existe plus. Il a peut-être été supprimé.\nVeuillez recharger la page.');
                    showListView();
                    return;
                } else {
                    console.log('savePostData - Post trouvé dans la liste, peut continuer');
                }
            } else {
                alert('Erreur: Impossible de vérifier l\'existence du post.');
                return;
            }
        } else {
            console.log('savePostData - Post trouvé, peut continuer la modification');
            // Vérifier que l'ID correspond
            if (existingPost.Id !== post.Id) {
                console.warn('savePostData - ID différent:', 'demandé:', post.Id, 'reçu:', existingPost.Id);
                // Utiliser l'ID reçu du serveur
                post.Id = existingPost.Id;
                $('#editId').val(post.Id);
            }
        }
        
        const keepDate = $('#keepCreationDate').is(':checked');
        if (keepDate) {
            // Conserver la date de création originale
            const originalCreation = $('#editId').attr('data-original-creation');
            console.log('savePostData - Date de création originale:', originalCreation);
            post.Creation = originalCreation ? parseInt(originalCreation) : Math.floor(Date.now() / 1000);
        } else {
            // Nouvelle date de création
            post.Creation = Math.floor(Date.now() / 1000);
        }
    } else {
        // AJOUT - Pas de vérification nécessaire
        post.Creation = Math.floor(Date.now() / 1000);
        console.log('savePostData - Ajout - Pas de vérification nécessaire');
    }
    
    // S'assurer que tous les champs requis sont présents
    if (!post.Category) post.Category = '';
    if (!post.Title) post.Title = '';
    if (!post.Text) post.Text = '';
    if (!post.Image) post.Image = '';
    // S'assurer que Creation est toujours défini
    if (!post.Creation) post.Creation = Math.floor(Date.now() / 1000);
    
    console.log('Données à sauvegarder:', {
        Category: post.Category,
        Title: post.Title,
        Text: post.Text ? post.Text.substring(0, 50) + '...' : '(vide)',
        Image: post.Image ? (post.Image.substring(0, 50) + '...') : '(vide)',
        Creation: post.Creation,
        Id: post.Id || '(nouveau)'
    });
    
    $('#loadingContainer').show();
    const savedPost = await API_SavePost(post, isNew);
    $('#loadingContainer').hide();
    
    if (savedPost) {
        console.log('savePostData - Post sauvegardé avec succès:', savedPost);
        console.log('savePostData - Type d\'opération:', isNew ? 'AJOUT' : 'MODIFICATION');
        // Attendre un peu pour que le cache serveur soit mis à jour
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('savePostData - Rechargement de la liste...');
        // Forcer le rechargement en vidant d'abord le tableau posts
        posts = [];
        showListView();
    } else {
        const errorMsg = API_getcurrentHttpError() || 'Erreur inconnue';
        console.error('Erreur de sauvegarde:', errorMsg);
        console.error('savePostData - Type d\'opération:', isNew ? 'AJOUT' : 'MODIFICATION');
        alert('Erreur lors de la sauvegarde:\n' + errorMsg);
    }
}

// Supprimer un post
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
        // Suppression réussie
        showListView();
    } else {
        const errorMsg = API_getcurrentHttpError() || 'Erreur inconnue';
        console.error('Erreur de suppression:', errorMsg);
        alert('Erreur lors de la suppression:\n' + errorMsg);
    }
}

// Fonctions pour accéder aux vues depuis l'extérieur
window.showEditView = showEditView;
window.showDeleteView = showDeleteView;

async function loadPosts() {
    console.log('loadPosts - Début du chargement des posts...');
    $('#loadingContainer').show();
    $('#postsContainer').empty();
    
    posts = await API_GetPosts();
    console.log('loadPosts - Posts récupérés:', posts ? posts.length : 0, 'posts');
    
    $('#loadingContainer').hide();
    
    if (posts && posts.length > 0) {
        // Trier les posts par date de création (du plus récent au plus ancien)
        posts.sort((a, b) => {
            const dateA = a.Creation || 0;
            const dateB = b.Creation || 0;
            return dateB - dateA; // Ordre décroissant
        });
        
        console.log('loadPosts - Affichage de', posts.length, 'posts');
        posts.forEach(post => {
            renderPost(post);
        });
    } else {
        console.log('loadPosts - Aucun post trouvé, affichage de l\'état vide');
        showEmptyState();
    }
}

function renderPost(post) {
    const postText = escapeHtml(post.Text || '');
    const textLength = post.Text ? post.Text.length : 0;
    // Tronquer si plus de 200 caractères (environ 3 lignes)
    const shouldTruncate = textLength > 200;
    
    const postHtml = `
        <div class="post-article" data-post-id="${post.Id}">
            <div class="post-actions">
                <i class="fa fa-pencil post-action-btn edit-btn" data-post-id="${post.Id}" title="Modifier"></i>
                <i class="fa fa-trash post-action-btn delete-btn" data-post-id="${post.Id}" title="Supprimer"></i>
            </div>
            <div class="post-category">${escapeHtml(post.Category || 'GÉNÉRAL')}</div>
            <h2 class="post-title">${escapeHtml(post.Title || 'Sans titre')}</h2>
            ${post.Image ? `<img src="${post.Image}" alt="${escapeHtml(post.Title)}" class="post-image" onerror="this.style.display='none'">` : ''}
            <div class="post-date">${post.Creation ? convertToFrenchDate(post.Creation) : ''}</div>
            <div class="post-text ${shouldTruncate ? 'hideExtra' : ''}" data-post-id="${post.Id}">${postText}</div>
            ${shouldTruncate ? `
            <div class="post-read-more" data-post-id="${post.Id}">
                <i class="fa fa-chevron-down"></i>
            </div>
            ` : ''}
        </div>
    `;
    
    $('#postsContainer').append(postHtml);
    
    // Attacher l'événement de clic sur la flèche si le texte est tronqué
    if (shouldTruncate) {
        $(`#postsContainer .post-read-more[data-post-id="${post.Id}"]`).off('click').on('click', function() {
            const postId = $(this).attr('data-post-id');
            const $textElement = $(`#postsContainer .post-text[data-post-id="${postId}"]`);
            togglePostText($textElement, $(this));
        });
    }
    
    // Les événements sont maintenant gérés par délégation dans $(document).ready
    // Plus besoin d'attacher les événements ici
}

function togglePostText($textElement, $readMore) {
    const $icon = $readMore.find('i');
    
    if ($textElement.hasClass('hideExtra')) {
        // Afficher le texte complet
        $textElement.removeClass('hideExtra').addClass('showExtra');
        $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    } else {
        // Masquer le texte (tronquer)
        $textElement.removeClass('showExtra').addClass('hideExtra');
        $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
        
        // Faire défiler jusqu'au début du texte tronqué
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
