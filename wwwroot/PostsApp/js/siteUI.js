let posts = [];
let currentView = 'list'; // 'list', 'add', 'edit', 'delete'
let periodicRefreshInterval = null; // Intervalle pour la mise à jour périodique

// Gestionnaire de pagination
let paginationManager = {
    limit: 5, // Nombre de posts à charger par page
    offset: 0, // Offset actuel
    isLoading: false, // Indique si un chargement est en cours
    hasMore: true, // Indique s'il y a encore des posts à charger
    scrollThreshold: 300 // Distance en pixels du bas pour déclencher le chargement
};

$(document).ready(function () {
    loadPosts(true); // Charger la première page
    
    // Démarrer la mise à jour périodique avec ETag
    startPeriodicRefresh();
    
    // Configurer le défilement infini
    setupInfiniteScroll();
    
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
        let postId = $(this).attr('data-post-id');
        
        console.log('=== CLIC SUR MODIFIER ===');
        console.log('Clic sur bouton modifier - Post ID brut depuis data-post-id:', postId);
        console.log('Clic sur bouton modifier - Type:', typeof postId);
        console.log('Clic sur bouton modifier - Longueur:', postId ? postId.length : 0);
        
        // Vérifier aussi dans le tableau posts pour comparer
        const postElement = $(this).closest('.post-article');
        const postIdFromElement = postElement.attr('data-post-id');
        console.log('Clic sur bouton modifier - ID depuis .post-article:', postIdFromElement);
        
        // S'assurer que l'ID est bien formaté
        if (postId) {
            postId = String(postId).trim();
            console.log('Clic sur bouton modifier - Post ID formaté:', postId);
            
            // Vérifier que l'ID existe dans la liste des posts
            const postInList = posts.find(p => String(p.Id).trim() === postId);
            if (postInList) {
                console.log('✅ ID trouvé dans la liste des posts:', postId);
                console.log('Post trouvé:', { Id: postInList.Id, Title: postInList.Title });
                
                // Vérifier que l'ID dans la liste correspond exactement à l'ID utilisé
                const listId = String(postInList.Id).trim();
                const usedId = String(postId).trim();
                if (listId !== usedId) {
                    console.error('❌ ERREUR: L\'ID dans la liste ne correspond pas à l\'ID utilisé!');
                    console.error('ID utilisé:', usedId);
                    console.error('ID dans la liste:', listId);
                    console.error('Utilisation de l\'ID de la liste pour la modification');
                    postId = listId; // Utiliser l'ID de la liste
                    console.log('ID corrigé:', postId);
                }
            } else {
                console.error('❌ ERREUR: ID non trouvé dans la liste des posts!');
                console.error('ID recherché:', postId);
                console.error('IDs disponibles dans posts:', posts.map(p => p.Id));
                console.error('Vérifiez que le post existe bien dans la liste après la première modification');
                alert('Erreur: L\'ID du post n\'existe pas dans la liste. Veuillez recharger la page.');
                return;
            }
            
            if (postId && postId !== '' && postId !== 'undefined') {
                console.log('=== FIN CLIC SUR MODIFIER ===');
                showEditView(postId);
            } else {
                console.error('Clic sur bouton modifier - ID invalide après formatage:', postId);
                alert('Erreur: ID du post invalide');
            }
        } else {
            console.error('Clic sur bouton modifier - ID manquant dans data-post-id');
            console.error('Vérifiez que l\'attribut data-post-id est bien présent sur le bouton');
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
    

    

    $('#mainSearchBtn').on('click', function() {
        triggerMainSearch();
    });
    $('#mainSearchInput').on('keypress', function(e) {
        if (e.which === 13) triggerMainSearch();
    });

    $('#closeSearchBtn').on('click', function() {
        $('#searchBarContainer').slideUp(180);
        $('#mainSearchInput').val('');
        currentSearchWords = [];
        showListView(); // Affiche tous les posts sans filtre
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
    $('#loadingMoreContainer').hide();
    loadPosts(true); // Réinitialiser la pagination
    setupInfiniteScroll(); // Configurer le défilement infini
}

// Démarrer la mise à jour périodique avec ETag
function startPeriodicRefresh() {
    // Arrêter l'intervalle existant s'il y en a un
    if (periodicRefreshInterval) {
        clearInterval(periodicRefreshInterval);
    }
    
    // Vérifier l'ETag toutes les 5 secondes
    periodicRefreshInterval = setInterval(async function() {
        // Ne vérifier que si on est sur la vue liste
        if (currentView === 'list') {
            await checkAndRefreshIfNeeded();
        }
    }, 5000); // 5 secondes
    
    console.log('Mise à jour périodique avec ETag démarrée (vérification toutes les 5 secondes)');
}

// Arrêter la mise à jour périodique
function stopPeriodicRefresh() {
    if (periodicRefreshInterval) {
        clearInterval(periodicRefreshInterval);
        periodicRefreshInterval = null;
        console.log('Mise à jour périodique arrêtée');
    }
}

// Vérifier l'ETag et mettre à jour si nécessaire
async function checkAndRefreshIfNeeded() {
    try {
        const newETag = await API_GetETag();
        const currentETag = API_getCurrentETag();
        
        if (newETag && currentETag && newETag !== currentETag) {
            console.log('ETag a changé - rechargement de la liste...');
            console.log('Ancien ETag:', currentETag);
            console.log('Nouveau ETag:', newETag);
            
            // Recharger la liste (réinitialiser la pagination)
            await loadPosts(true);
        } else if (newETag && !currentETag) {
            // Première fois, stocker l'ETag
            console.log('Premier ETag reçu:', newETag);
        }
        
        // Ne pas modifier hasMore ici - laisser loadPosts gérer ça
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'ETag:', error);
    }
}

// Configurer le défilement infini
function setupInfiniteScroll() {
    // Retirer les anciens gestionnaires d'événements
    $(window).off('scroll.pagination');
    
    // Ajouter le gestionnaire de défilement avec debounce
    let scrollTimeout = null;
    $(window).on('scroll.pagination', async function() {
        // Ne vérifier que si on est sur la vue liste
        if (currentView !== 'list') {
            return;
        }
        
        // Debounce pour éviter trop d'appels
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        scrollTimeout = setTimeout(async function() {
            // Calculer la distance du bas de la page
            const scrollTop = $(window).scrollTop() || $(document).scrollTop();
            const windowHeight = $(window).height();
            const documentHeight = $(document).height() || document.body.scrollHeight;
            const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
            
            // Vérifier si on est proche du bas (y compris si on est déjà au-delà)
            const isNearBottom = distanceFromBottom <= paginationManager.scrollThreshold || distanceFromBottom < 0;
            
            console.log('Scroll détecté:', {
                scrollTop: scrollTop,
                windowHeight: windowHeight,
                documentHeight: documentHeight,
                distanceFromBottom: distanceFromBottom,
                threshold: paginationManager.scrollThreshold,
                isNearBottom: isNearBottom,
                hasMore: paginationManager.hasMore,
                isLoading: paginationManager.isLoading
            });
            
            // Si on est proche du bas et qu'il y a encore des posts à charger
            if (isNearBottom && 
                paginationManager.hasMore && 
                !paginationManager.isLoading) {
                console.log('✅ Défilement infini - Chargement de la page suivante...');
                await loadPosts(false); // Charger la page suivante sans réinitialiser
            } else if (!paginationManager.hasMore) {
                console.log('⚠️ Défilement infini - Plus de posts à charger (hasMore = false)');
            } else if (paginationManager.isLoading) {
                console.log('⚠️ Défilement infini - Chargement déjà en cours (isLoading = true)');
            } else if (!isNearBottom) {
                console.log('ℹ️ Défilement infini - Pas encore assez proche du bas');
            }
        }, 100); // Debounce de 100ms
    });
}

// Arrêter le défilement infini
function stopInfiniteScroll() {
    $(window).off('scroll.pagination');
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
    
    // S'assurer que l'ID est bien défini avant de réinitialiser
    if (!postId || postId === '' || postId === 'undefined') {
        console.error('showEditView - PostId invalide:', postId);
        alert('Erreur: ID du post invalide pour la modification');
        showListView();
        return;
    }
    
    // Réinitialiser le formulaire avant de charger
    $('#editForm')[0].reset();
    // Préserver l'ID pendant la réinitialisation
    $('#editId').val(postId);
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
    
    // S'assurer que l'ID est bien formaté (string, sans espaces)
    postId = String(postId).trim();
    
    console.log('loadPostForEdit - Chargement du post ID:', postId);
    console.log('loadPostForEdit - Type de ID:', typeof postId);
    
    // Attendre un peu pour s'assurer que le cache serveur est à jour
    // Cela peut aider si on modifie rapidement plusieurs fois
    await new Promise(resolve => setTimeout(resolve, 200));
    
    $('#loadingContainer').show();
    
    // Essayer de charger le post avec plusieurs tentatives si nécessaire
    // Le cache serveur peut avoir besoin de temps pour se mettre à jour
    let post = null;
    let attempts = 0;
    const maxAttempts = 3; // Réduire le nombre de tentatives mais augmenter le délai
    
    while (!post && attempts < maxAttempts) {
        attempts++;
        console.log(`loadPostForEdit - Tentative ${attempts}/${maxAttempts} pour charger le post ID:`, postId);
        post = await API_GetPost(postId);
        
        if (!post && attempts < maxAttempts) {
            // Attendre un peu plus avant de réessayer (délai progressif)
            const delay = 500 * attempts; // 500ms, 1000ms
            console.log(`loadPostForEdit - Attente de ${delay}ms avant la prochaine tentative...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // Si le post n'a pas été trouvé, vérifier s'il existe dans la liste locale
    if (!post) {
        console.warn('loadPostForEdit - Post non trouvé via API, vérification dans la liste locale...');
        const postInList = posts.find(p => String(p.Id).trim() === postId);
        if (postInList) {
            console.log('loadPostForEdit - Post trouvé dans la liste locale, utilisation de ces données');
            post = postInList;
        } else {
            console.error('loadPostForEdit - Post non trouvé ni via API ni dans la liste locale');
            console.error('loadPostForEdit - ID recherché:', postId);
            console.error('loadPostForEdit - IDs dans la liste locale:', posts.map(p => p.Id));
        }
    }
    
    $('#loadingContainer').hide();
    
    if (post) {
        console.log('loadPostForEdit - Post chargé:', post.Id);
        console.log('loadPostForEdit - Post complet:', post);
        
        // S'assurer que l'ID est bien défini
        if (!post.Id || post.Id === '' || post.Id === 'undefined') {
            console.error('loadPostForEdit - Post sans ID valide:', post.Id);
            alert('Erreur: Le post chargé n\'a pas d\'ID valide');
            showListView();
            return;
        }
        
        // Vérifier que l'ID correspond à celui demandé
        const receivedId = String(post.Id).trim();
        const requestedId = String(postId).trim();
        
        if (receivedId !== requestedId) {
            console.warn('loadPostForEdit - ID différent:', 'demandé:', requestedId, 'reçu:', receivedId);
            // Utiliser l'ID reçu du serveur - c'est la source de vérité
            postId = receivedId;
        }
        
        // Stocker l'ID dans le champ caché - s'assurer que c'est une string
        // Utiliser l'ID reçu du serveur comme source de vérité
        const postIdString = String(post.Id).trim();
        $('#editId').val(postIdString);
        console.log('loadPostForEdit - ID stocké dans #editId:', postIdString);
        $('#editCategory').val(post.Category || '');
        $('#editTitle').val(post.Title || '');
        $('#editText').val(post.Text || '');
        $('#keepCreationDate').prop('checked', true);
        
        // Stocker la date de création originale dans un attribut data
        if (post.Creation) {
            $('#editId').attr('data-original-creation', String(post.Creation));
        } else {
            $('#editId').removeAttr('data-original-creation');
        }
        
        console.log('loadPostForEdit - ID stocké dans #editId:', $('#editId').val());
        console.log('loadPostForEdit - Type de ID:', typeof $('#editId').val());
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
    
    // Pour les modifications, récupérer l'ID AVANT de créer l'objet post
    // pour s'assurer qu'il est toujours présent
    let postId = null;
    if (!isNew) {
        postId = $('#editId').val();
        if (!postId || postId === '' || postId === 'undefined') {
            alert('Erreur: ID du post introuvable pour la modification. Veuillez recharger la page.');
            console.error('savePost - ID manquant dans #editId avant la sauvegarde:', postId);
            return;
        }
        postId = String(postId).trim();
        console.log('savePost - ID récupéré depuis #editId:', postId);
    }
    
    // Construire l'objet post avec l'ID directement inclus pour les modifications
    const post = {
        Category: $('#' + (isNew ? 'add' : 'edit') + 'Category').val() || '',
        Title: $('#' + (isNew ? 'add' : 'edit') + 'Title').val() || '',
        Text: $('#' + (isNew ? 'add' : 'edit') + 'Text').val() || '',
        Image: ''
    };
    
    // Pour les modifications, AJOUTER L'ID DIRECTEMENT DANS L'OBJET POST
    // C'est la ligne critique qui manquait !
    if (!isNew && postId) {
        post.Id = postId;
        console.log('savePost - ID assigné à l\'objet post:', post.Id);
    }
    
    // Gérer l'image
    const imageInput = $('#' + (isNew ? 'add' : 'edit') + 'Image')[0];
    const imagePreview = $('#' + (isNew ? 'add' : 'edit') + 'ImagePreview');
    
    // S'assurer que l'ID est TOUJOURS présent dans l'objet post AVANT tous les callbacks
    // C'est la ligne critique qui manquait !
    if (!isNew && postId) {
        post.Id = postId; // Assigner l'ID directement dans l'objet post
        console.log('savePost - ID assigné à l\'objet post avant traitement image:', post.Id);
    }
    
    if (imageInput && imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        // Utiliser une closure pour capturer postId et s'assurer que l'ID est toujours présent
        const capturedPostId = postId;
        reader.onload = async function(e) {
            // S'assurer que l'ID est toujours présent dans le callback
            if (!isNew && capturedPostId && !post.Id) {
                post.Id = capturedPostId;
            }
            post.Image = e.target.result || '';
            console.log('savePost - Appel savePostData avec post.Id:', post.Id);
            await savePostData(post, isNew);
        };
        reader.onerror = async function() {
            console.error('Erreur lors de la lecture de l\'image');
            // S'assurer que l'ID est toujours présent dans le callback
            if (!isNew && capturedPostId && !post.Id) {
                post.Id = capturedPostId;
            }
            post.Image = '';
            console.log('savePost - Appel savePostData avec post.Id:', post.Id);
            await savePostData(post, isNew);
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else if (!isNew && imagePreview.is(':visible') && imagePreview.attr('src')) {
        // En modification, conserver l'image existante si elle n'a pas été changée
        // L'ID devrait déjà être dans post.Id, mais on vérifie quand même
        if (!post.Id && postId) {
            post.Id = postId;
        }
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
        console.log('savePost - Appel savePostData avec post.Id:', post.Id);
        await savePostData(post, isNew);
    } else {
        // Pas d'image, envoyer une chaîne vide
        // L'ID devrait déjà être dans post.Id, mais on vérifie quand même
        if (!isNew && postId && !post.Id) {
            post.Id = postId;
        }
        post.Image = '';
        console.log('savePost - Appel savePostData avec post.Id:', post.Id);
        await savePostData(post, isNew);
    }
}

// Sauvegarder les données du post
async function savePostData(post, isNew) {
    if (!isNew) {
        // MODIFICATION
        // Vérifier que l'ID est présent dans l'objet post
        if (!post.Id || post.Id === '' || post.Id === 'undefined') {
            // Si l'ID n'est pas dans l'objet post, essayer de le récupérer depuis le champ caché
            const editId = $('#editId').val();
            console.log('savePostData - Modification - ID manquant dans post, récupération depuis #editId:', editId);
            
            if (!editId || editId === '' || editId === 'undefined') {
                alert('Erreur: ID du post introuvable pour la modification. Veuillez recharger la page.');
                console.error('savePostData - ID manquant à la fois dans post et dans #editId');
                console.error('savePostData - État du formulaire:', {
                    postId: post.Id,
                    editId: $('#editId').val(),
                    editIdType: typeof $('#editId').val(),
                    editIdLength: $('#editId').val() ? $('#editId').val().length : 0
                });
                return;
            }
            
            post.Id = String(editId).trim();
        }
        
        // S'assurer que l'ID est bien formaté
        post.Id = String(post.Id).trim();
        
        console.log('savePostData - Modification - Post ID final:', post.Id);
        console.log('savePostData - Modification - Type de ID:', typeof post.Id);
        console.log('savePostData - Modification - ID dans #editId:', $('#editId').val());
        
        // Ne pas vérifier l'existence du post - cela peut causer des problèmes de cache
        // Le serveur retournera 404 si le post n'existe pas, on gérera l'erreur à ce moment-là
        
        // IMPORTANT: Pour une modification, TOUJOURS utiliser la date de création originale
        // Ne JAMAIS modifier Creation lors d'une modification, sinon le backend ne reconnaîtra plus le post
        const originalCreation = $('#editId').attr('data-original-creation');
        console.log('savePostData - Date de création originale depuis data-original-creation:', originalCreation);
        
        if (originalCreation && originalCreation !== '' && originalCreation !== 'undefined') {
            // Utiliser la date originale stockée dans l'attribut data
            // S'assurer que c'est un nombre (timestamp UNIX en secondes)
            const creationValue = parseInt(originalCreation);
            if (!isNaN(creationValue)) {
                post.Creation = creationValue;
                console.log('savePostData - Date de création originale utilisée:', post.Creation);
            } else {
                console.error('savePostData - Date de création originale invalide:', originalCreation);
                // Si la date n'est pas valide, essayer de la récupérer depuis le post chargé
                // Mais normalement cela ne devrait jamais arriver
                console.error('savePostData - Impossible de parser la date de création originale');
            }
        } else {
            console.error('❌ ERREUR: Date de création originale non disponible!');
            console.error('savePostData - data-original-creation:', originalCreation);
            console.error('savePostData - Cela ne devrait pas arriver - la date devrait être stockée lors du chargement');
            // En dernier recours, ne pas modifier Creation - laisser le serveur gérer
            // Mais cela ne devrait jamais arriver
            console.error('savePostData - La date de création ne sera pas modifiée - le serveur utilisera celle existante');
        }
    } else {
        // AJOUT - Créer une nouvelle date de création
        post.Creation = Math.floor(Date.now() / 1000);
        console.log('savePostData - Ajout - Nouvelle date de création:', post.Creation);
    }
    
    // S'assurer que tous les champs requis sont présents
    if (!post.Category) post.Category = '';
    if (!post.Title) post.Title = '';
    if (!post.Text) post.Text = '';
    if (!post.Image) post.Image = '';
    // Pour les modifications, Creation est déjà défini (date originale)
    // Pour les ajouts, Creation est déjà défini (nouvelle date)
    // Ne pas réinitialiser Creation ici car cela pourrait écraser la date originale
    
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
        
        // Si c'est une modification, s'assurer que l'ID est bien préservé dans le champ caché
        // L'ID retourné par le serveur est la source de vérité
        if (!isNew) {
            if (savedPost.Id) {
                const savedId = String(savedPost.Id).trim();
                const originalId = String(post.Id).trim();
                
                console.log('=== VÉRIFICATION ID APRÈS SAUVEGARDE ===');
                console.log('savePostData - ID envoyé au serveur:', originalId);
                console.log('savePostData - ID retourné par serveur:', savedId);
                console.log('savePostData - IDs correspondent?', originalId === savedId);
                
                // TOUJOURS utiliser l'ID retourné par le serveur - c'est la source de vérité
                $('#editId').val(savedId);
                console.log('savePostData - ID préservé dans #editId après sauvegarde:', savedId);
                
                // Si l'ID a changé, c'est un problème - le serveur ne devrait pas changer l'ID
                if (savedId !== originalId) {
                    console.error('❌ ERREUR: L\'ID a changé après la sauvegarde!');
                    console.error('savePostData - ID envoyé:', originalId);
                    console.error('savePostData - ID reçu:', savedId);
                    console.error('savePostData - Cela ne devrait pas arriver - le serveur ne devrait pas changer l\'ID');
                }
                console.log('=== FIN VÉRIFICATION ===');
            } else {
                console.error('❌ ERREUR: Aucun ID retourné par le serveur après modification');
                console.error('savePostData - Post retourné:', savedPost);
                alert('Erreur: Aucun ID retourné par le serveur après la modification. Veuillez recharger la page.');
                return;
            }
        }
        
        // Attendre un peu pour que le cache serveur soit mis à jour
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('savePostData - Rechargement de la liste...');
        // Forcer le rechargement en vidant d'abord le tableau posts
        posts = [];
        await loadPosts(true); // Attendre que la liste soit chargée avant de continuer (réinitialiser la pagination)
        
        // Vérifier que le post modifié est bien dans la liste avec le bon ID
        if (!isNew && savedPost.Id) {
            const savedId = String(savedPost.Id).trim();
            const originalId = String(post.Id).trim();
            
            console.log('=== VÉRIFICATION POST DANS LA LISTE ===');
            console.log('savePostData - ID envoyé au serveur:', originalId);
            console.log('savePostData - ID retourné par serveur:', savedId);
            console.log('savePostData - IDs correspondent?', originalId === savedId);
            
            // Attendre un peu plus pour que la liste soit complètement chargée
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Vérifier que le post existe dans la liste avec l'ID retourné par le serveur
            const foundPost = posts.find(p => String(p.Id).trim() === savedId);
            if (!foundPost) {
                console.error('❌ ERREUR CRITIQUE: Post modifié non trouvé dans la liste après rechargement!');
                console.error('savePostData - ID recherché:', savedId);
                console.error('savePostData - IDs dans la liste:', posts.map(p => ({ Id: p.Id, Title: p.Title })));
                console.error('savePostData - Le post avec cet ID n\'existe pas dans la liste - cela causera une erreur 404 lors de la prochaine modification');
                console.error('savePostData - Vérifiez que le serveur retourne bien le post avec le bon ID');
                
                // Essayer de trouver le post avec l'ID original
                const foundWithOriginalId = posts.find(p => String(p.Id).trim() === originalId);
                if (foundWithOriginalId) {
                    console.warn('savePostData - Post trouvé avec l\'ID original:', originalId);
                    console.warn('savePostData - Le serveur a peut-être changé l\'ID?');
                    console.warn('savePostData - Utilisation de l\'ID original pour la prochaine modification');
                    // Utiliser l'ID original si le post est trouvé avec cet ID
                    $('#editId').val(originalId);
                } else {
                    // Si aucun post n'est trouvé, essayer de recharger la liste une fois de plus
                    console.warn('savePostData - Rechargement de la liste une fois de plus...');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    posts = [];
                    await loadPosts(true); // Réinitialiser la pagination après suppression
                    
                    const foundPostRetry = posts.find(p => String(p.Id).trim() === savedId);
                    if (foundPostRetry) {
                        console.log('✅ Post trouvé après rechargement supplémentaire, ID:', savedId);
                    } else {
                        console.error('❌ Post toujours introuvable après rechargement supplémentaire');
                        console.error('savePostData - IDs dans la liste:', posts.map(p => ({ Id: p.Id, Title: p.Title })));
                    }
                }
            } else {
                console.log('✅ Post modifié trouvé dans la liste, ID:', savedId);
                console.log('savePostData - Post trouvé:', { Id: foundPost.Id, Title: foundPost.Title });
            }
            console.log('=== FIN VÉRIFICATION ===');
        }
        
        showListView();
    } else {
        const errorMsg = API_getcurrentHttpError() || 'Erreur inconnue';
        console.error('Erreur de sauvegarde:', errorMsg);
        console.error('savePostData - Type d\'opération:', isNew ? 'AJOUT' : 'MODIFICATION');
        console.error('savePostData - Post ID utilisé:', post.Id);
        console.error('savePostData - État du champ #editId:', $('#editId').val());
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

// Charger les posts avec pagination
async function loadPosts(reset = false) {
    if (paginationManager.isLoading) {
        console.log('loadPosts - Chargement déjà en cours, ignoré');
        return;
    }
    
    if (reset) {
        paginationManager.offset = 0;
        paginationManager.hasMore = true;
        posts = [];
        $('#postsContainer').empty();
    }
    
    if (!paginationManager.hasMore) {
        console.log('loadPosts - Plus de posts à charger');
        return;
    }
    
    paginationManager.isLoading = true;
    console.log('🔵 loadPosts - Début du chargement des posts...', {
        limit: paginationManager.limit,
        offset: paginationManager.offset,
        hasMore: paginationManager.hasMore,
        isLoading: paginationManager.isLoading
    });
    
    // Afficher le loader approprié
    if (paginationManager.offset === 0) {
        // Premier chargement : utiliser le loader principal
        $('#loadingContainer').show();
        $('#loadingMoreContainer').hide();
    } else {
        // Chargement suivant : utiliser l'indicateur de chargement en bas
        $('#loadingContainer').hide();
        $('#loadingMoreContainer').show();
        
        // Ajouter un petit délai pour que l'utilisateur voie l'indicateur
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const newPosts = await API_GetPosts(paginationManager.limit, paginationManager.offset);
    console.log('🔵 loadPosts - Posts récupérés:', newPosts ? newPosts.length : 0, 'posts');
    console.log('🔵 loadPosts - Requête API: limit=', paginationManager.limit, ', offset=', paginationManager.offset);
    console.log('🔵 loadPosts - Total de posts dans la liste avant ajout:', posts.length);
    console.log('🔵 loadPosts - newPosts:', newPosts);
    
    // Masquer tous les loaders après le chargement
    $('#loadingContainer').hide();
    $('#loadingMoreContainer').hide();
    
    if (newPosts && newPosts.length > 0) {
        // Trier les posts par date de création (du plus récent au plus ancien)
        newPosts.sort((a, b) => {
            const dateA = a.Creation || 0;
            const dateB = b.Creation || 0;
            return dateB - dateA; // Ordre décroissant
        });
        
        // Ajouter les nouveaux posts à la liste existante
        posts = posts.concat(newPosts);
        
        console.log('✅ loadPosts - Affichage de', newPosts.length, 'nouveaux posts');
        console.log('✅ loadPosts - Total de posts affichés:', posts.length);
        console.log('✅ loadPosts - Offset actuel:', paginationManager.offset);
        console.log('✅ loadPosts - Nouveaux posts:', newPosts.map(p => p.Title));
        
        // Afficher les nouveaux posts
        newPosts.forEach(post => {
            renderPost(post);
        });
        
        // Vérifier s'il y a encore des posts à charger
        // Si on reçoit exactement le nombre de posts demandé, il y a peut-être encore des posts
        // On ne met hasMore à false que si on reçoit moins de posts que le limit
        if (newPosts.length < paginationManager.limit) {
            paginationManager.hasMore = false;
            console.log('⚠️ loadPosts - Fin des posts atteinte (moins de posts que le limit)');
            console.log('⚠️ loadPosts - Reçu:', newPosts.length, 'posts, limit:', paginationManager.limit);
        } else {
            // Mettre à jour l'offset (numéro de page) AVANT de terminer
            // L'API utilise offset comme numéro de page, pas comme index d'élément
            // offset = 0 → page 0, offset = 1 → page 1, etc.
            paginationManager.offset += 1; // Incrémenter le numéro de page
            console.log('✅ loadPosts - Offset (numéro de page) mis à jour à:', paginationManager.offset);
            console.log('✅ loadPosts - hasMore reste:', paginationManager.hasMore);
            console.log('✅ loadPosts - Reçu', newPosts.length, 'posts (égal au limit), on continue...');
        }
    } else {
        paginationManager.hasMore = false;
        console.log('⚠️ loadPosts - Aucun post trouvé, hasMore = false');
        
        // Afficher l'état vide seulement si c'est le premier chargement
        if (paginationManager.offset === 0) {
            showEmptyState();
        }
    }
    
    paginationManager.isLoading = false;
    console.log('✅ loadPosts - Chargement terminé, isLoading = false');
}

function renderPost(post) {
    const postText = escapeHtml(post.Text || '');
    const textLength = post.Text ? post.Text.length : 0;
    // Tronquer si plus de 200 caractères (environ 3 lignes)
    const shouldTruncate = textLength > 200;
    
    // S'assurer que l'ID est bien défini et formaté
    if (!post.Id || post.Id === '' || post.Id === 'undefined') {
        console.error('❌ renderPost - Post sans ID valide:', post);
        console.error('renderPost - Post complet:', JSON.stringify(post, null, 2));
        return; // Ne pas afficher le post s'il n'a pas d'ID valide
    }
    
    const postId = String(post.Id).trim();
    const escapedPostId = escapeHtml(postId);
    
    // Logger pour vérification
    console.log('renderPost - Affichage du post avec ID:', postId, 'Titre:', post.Title);
    
    const postHtml = `
        <div class="post-article" data-post-id="${escapedPostId}">
            <div class="post-actions">
                <i class="fa fa-pencil post-action-btn edit-btn" data-post-id="${escapedPostId}" title="Modifier"></i>
                <i class="fa fa-trash post-action-btn delete-btn" data-post-id="${escapedPostId}" title="Supprimer"></i>
            </div>
            <div class="post-category">${escapeHtml(post.Category || 'GÉNÉRAL')}</div>
            <h2 class="post-title">${escapeHtml(post.Title || 'Sans titre')}</h2>
            ${post.Image ? `<img src="${post.Image}" alt="${escapeHtml(post.Title)}" class="post-image" onerror="this.style.display='none'">` : ''}
            <div class="post-date">${post.Creation ? convertToFrenchDate(post.Creation) : ''}</div>
            <div class="post-text ${shouldTruncate ? 'hideExtra' : ''}" data-post-id="${escapedPostId}">${postText}</div>
            ${shouldTruncate ? `
            <div class="post-read-more" data-post-id="${escapedPostId}">
                <i class="fa fa-chevron-down"></i>
            </div>
            ` : ''}
        </div>
    `;
    
    $('#postsContainer').append(postHtml);
    
    // Attacher l'événement de clic sur la flèche si le texte est tronqué
    if (shouldTruncate) {
        $(`#postsContainer .post-read-more[data-post-id="${escapedPostId}"]`).off('click').on('click', function() {
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
// --- Menu Catégories ---

// Extraire toutes les catégories uniques des posts
function getAllCategories() {
    const cats = posts.map(p => p.Category && p.Category.trim() ? p.Category.trim() : 'GÉNÉRAL');
    return Array.from(new Set(cats));
}

// Créer le menu catégories si pas déjà présent
function createCategoryMenu() {
    if ($('#categoryMenu').length === 0) {
        $('body').append(`
            <div id="categoryMenu" style="position:absolute;display:none;z-index:3000;background:#fff;border:1px solid #ccc;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.15);min-width:180px;padding:8px;">
            </div>
        `);
    }
}

// Afficher le menu catégories à côté du bouton
function showCategoryMenu() {
    createCategoryMenu();
    const categories = getAllCategories();
    let html = `<div style="font-weight:bold;margin-bottom:6px;">Catégories</div>`;
    html += `<div class="cat-item" data-cat="TOUT" style="padding:6px 10px;cursor:pointer;border-radius:4px;">Tout afficher</div>`;
    categories.forEach(cat => {
        html += `<div class="cat-item" data-cat="${escapeHtml(cat)}" style="padding:6px 10px;cursor:pointer;border-radius:4px;">${escapeHtml(cat)}</div>`;
    });
    $('#categoryMenu').html(html);

    // Positionner le menu sous le bouton
    const btn = $('#menuBtn')[0];
    const rect = btn.getBoundingClientRect();
    $('#categoryMenu').css({
        left: rect.left + window.scrollX,
        top: rect.bottom + window.scrollY + 4
    }).fadeIn(120);
}

// Fermer le menu si clic ailleurs
$(document).on('mousedown', function(e){
    if ($('#categoryMenu').is(':visible') && !$(e.target).closest('#categoryMenu, #menuBtn').length){
        $('#categoryMenu').fadeOut(100);
    }
});



// Filtrer les posts selon la catégorie choisie
$(document).on('click', '.cat-item', function(){
    const cat = $(this).data('cat');
    $('#categoryMenu').fadeOut(100);
    $('#postsContainer').empty();
    if (cat === 'TOUT') {
        posts.forEach(renderPost);
    } else {
        posts.filter(p => (p.Category && p.Category.trim()) ? p.Category.trim() === cat : 'GÉNÉRAL' === cat)
             .forEach(renderPost);
    }
});

function showSearchForm() {
    $('#postsContainer').empty().append(`
        <form id="searchForm" style="padding:16px 8px; text-align:center;">
            <input type="text" id="searchInput" class="form-control" placeholder="Rechercher des mots..." style="max-width:320px;display:inline-block;" autofocus>
            <button type="submit" class="form-action-btn save-btn" style="margin-left:8px;">Rechercher</button>
        </form>
        <div id="searchResults"></div>
    `);
    $('#searchInput').focus();

    $('#searchForm').on('submit', function(e) {
        e.preventDefault();
        const search = $('#searchInput').val();
        if (!search || !search.trim()) return;

        const words = search.trim().toLowerCase().split(/\s+/);

        function highlightWords(text, words) {
            if (!text) return '';
            let result = text;
            words.forEach(word => {
                if (word.length > 0) {
                    const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                    result = result.replace(regex, '<span class="highlight-search">$1</span>');
                }
            });
            return result;
        }

        const filtered = posts.filter(post => {
            const content = ((post.Title || '') + ' ' + (post.Text || '')).toLowerCase();
            return words.every(word => content.includes(word));
        });

        $('#searchResults').empty();
        if (filtered.length > 0) {
            filtered.forEach(post => {
                const highlightedTitle = highlightWords(escapeHtml(post.Title || ''), words);
                const highlightedText = highlightWords(escapeHtml(post.Text || ''), words);
                const postHtml = `
                    <div class="post-article" data-post-id="${escapeHtml(post.Id)}">
                        <div class="post-category">${escapeHtml(post.Category || 'GÉNÉRAL')}</div>
                        <h2 class="post-title">${highlightedTitle}</h2>
                        ${post.Image ? `<img src="${post.Image}" alt="${escapeHtml(post.Title)}" class="post-image" onerror="this.style.display='none'">` : ''}
                        <div class="post-date">${post.Creation ? convertToFrenchDate(post.Creation) : ''}</div>
                        <div class="post-text">${highlightedText}</div>
                    </div>
                `;
                $('#searchResults').append(postHtml);
            });
        } else {
            $('#searchResults').append(`
                <div class="empty-state">
                    <i class="fa fa-search"></i>
                    <p>Aucun article ne correspond à votre recherche.</p>
                </div>
            `);
        }
    });
}


$('#closeSearchBtn').on('click', function() {
    $('#searchBarContainer').slideUp(180);
    $('#mainSearchInput').val('');
    showListView();
});

let currentSearchWords = []; 

$('#searchBtn').off('click').on('click', function() {
    if ($('#searchBarContainer').is(':visible')) {
        // Barre ouverte : la fermer mais garder le filtre actif
        $('#searchBarContainer').slideUp(180);
        $('#mainSearchInput').blur();
        // NE PAS appeler showListView() ici
    } else {
        // Barre fermée : l'ouvrir et remettre les mots recherchés si besoin
        $('#searchBarContainer').slideDown(180);
        $('#mainSearchInput').focus();
        if (currentSearchWords.length > 0) {
            $('#mainSearchInput').val(currentSearchWords.join(' '));
        }
    }
});

function triggerMainSearch() {
    const search = $('#mainSearchInput').val();
    if (!search || !search.trim()) return;

    currentSearchWords = search.trim().toLowerCase().split(/\s+/);

    function highlightWords(text, words) {
        if (!text) return '';
        let result = text;
        words.forEach(word => {
            if (word.length > 0) {
                const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                result = result.replace(regex, '<span class="highlight-search">$1</span>');
            }
        });
        return result;
    }

    const filtered = posts.filter(post => {
        const content = ((post.Title || '') + ' ' + (post.Text || '')).toLowerCase();
        return currentSearchWords.every(word => content.includes(word));
    });

    $('#postsContainer').empty();
    if (filtered.length > 0) {
        filtered.forEach(post => {
            const highlightedTitle = highlightWords(escapeHtml(post.Title || ''), currentSearchWords);
            const highlightedText = highlightWords(escapeHtml(post.Text || ''), currentSearchWords);
            const postHtml = `
                <div class="post-article" data-post-id="${escapeHtml(post.Id)}">
                    <div class="post-category">${escapeHtml(post.Category || 'GÉNÉRAL')}</div>
                    <h2 class="post-title">${highlightedTitle}</h2>
                    ${post.Image ? `<img src="${post.Image}" alt="${escapeHtml(post.Title)}" class="post-image" onerror="this.style.display='none'">` : ''}
                    <div class="post-date">${post.Creation ? convertToFrenchDate(post.Creation) : ''}</div>
                    <div class="post-text">${highlightedText}</div>
                </div>
            `;
            $('#postsContainer').append(postHtml);
        });
    } else {
        $('#postsContainer').append(`
            <div class="empty-state">
                <i class="fa fa-search"></i>
                <p>Aucun article ne correspond à votre recherche.</p>
            </div>
        `);
    }
}