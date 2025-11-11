const API_URL = "http://localhost:5000/api/Posts";
let currentHttpError = "";
let currentETag = "";

function API_getcurrentHttpError() {
    return currentHttpError;
}

function API_getCurrentETag() {
    return currentETag;
}

function API_GetPosts(limit = null, offset = null) {
    return new Promise(resolve => {
        let url = API_URL;
        // Ajouter les paramètres de pagination si fournis
        if (limit !== null && offset !== null) {
            url += `?limit=${limit}&offset=${offset}`;
        }
        
        $.ajax({
            url: url,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            success: (posts, textStatus, xhr) => { 
                currentHttpError = ""; 
                // Récupérer l'ETag depuis les headers de la réponse
                const etag = xhr.getResponseHeader('ETag');
                if (etag) {
                    currentETag = etag;
                    console.log('API_GetPosts - ETag reçu:', currentETag);
                }
                resolve(posts); 
            },
            error: (xhr) => { 
                console.log(xhr); 
                currentHttpError = xhr.responseJSON?.error_description || "Erreur lors du chargement des posts";
                resolve(null); 
            }
        });
    });
}

// Récupérer l'ETag via une requête HEAD
function API_GetETag() {
    return new Promise(resolve => {
        $.ajax({
            url: API_URL,
            type: 'HEAD',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            complete: (xhr) => {
                const etag = xhr.getResponseHeader('ETag');
                if (etag) {
                    currentETag = etag;
                    console.log('API_GetETag - ETag reçu:', currentETag);
                }
                resolve(etag);
            },
            error: (xhr) => {
                console.error('API_GetETag - Erreur:', xhr);
                resolve(null);
            }
        });
    });
}

function API_GetPost(postId) {
    return new Promise(resolve => {
        // S'assurer que l'ID est bien formaté
        const formattedId = String(postId).trim();
        const url = API_URL + "/" + encodeURIComponent(formattedId);
        
        console.log('API_GetPost - URL:', url);
        console.log('API_GetPost - PostId demandé:', formattedId);
        console.log('API_GetPost - Type de PostId:', typeof formattedId);
        
        $.ajax({
            url: url,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            success: post => { 
                currentHttpError = ""; 
                console.log('API_GetPost - Post récupéré:', post ? post.Id : 'null');
                resolve(post); 
            },
            error: (xhr) => { 
                console.error('API_GetPost - Erreur:', xhr);
                console.error('API_GetPost - Status:', xhr.status);
                console.error('API_GetPost - PostId demandé:', formattedId);
                console.error('API_GetPost - URL appelée:', url);
                if (xhr.status === 404) {
                    currentHttpError = "Le post avec l'ID [" + formattedId + "] n'existe pas (Status: 404)";
                } else {
                    currentHttpError = xhr.responseJSON?.error_description || "Erreur lors du chargement du post";
                }
                resolve(null); 
            }
        });
    });
}

function API_SavePost(post, create) {
    return new Promise(resolve => {
        // S'assurer que l'ID est valide pour les modifications
        if (!create) {
            if (!post.Id || post.Id === '' || post.Id === 'undefined') {
                console.error('API_SavePost - ID invalide pour modification:', post.Id);
                currentHttpError = "Erreur: ID du post invalide pour la modification";
                resolve(null);
                return;
            }
        }
        
        const url = create ? API_URL : API_URL + "/" + encodeURIComponent(String(post.Id).trim());
        console.log('API_SavePost - URL:', url);
        console.log('API_SavePost - Method:', create ? 'POST' : 'PUT');
        console.log('API_SavePost - Post ID:', post.Id);
        console.log('API_SavePost - Create:', create);
        console.log('API_SavePost - Post complet:', {
            Id: post.Id,
            Title: post.Title,
            Category: post.Category,
            Creation: post.Creation
        });
        
        $.ajax({
            url: url,
            type: create ? "POST" : "PUT",
            contentType: 'application/json',
            data: JSON.stringify(post),
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            success: (data) => { 
                currentHttpError = ""; 
                console.log('API_SavePost - Succès, post retourné:', data);
                resolve(data); 
            },
            error: (xhr) => {
                console.error('API_SavePost - Erreur API:', xhr);
                console.error('API_SavePost - Status:', xhr.status);
                console.error('API_SavePost - Response:', xhr.responseText);
                console.error('API_SavePost - URL appelée:', url);
                console.error('API_SavePost - Post ID utilisé:', post.Id);
                console.error('API_SavePost - Type de post ID:', typeof post.Id);
                
                if (xhr.status === 404) {
                    currentHttpError = "Erreur: Le post avec l'ID [" + post.Id + "] n'existe pas (Status: 404). Veuillez recharger la page.";
                } else if (xhr.responseJSON) {
                    currentHttpError = xhr.responseJSON.error_description || 
                                     xhr.responseJSON.message || 
                                     JSON.stringify(xhr.responseJSON);
                } else if (xhr.responseText) {
                    currentHttpError = xhr.responseText;
                } else {
                    currentHttpError = "Erreur lors de la sauvegarde (Status: " + xhr.status + ")";
                }
                resolve(null); 
            }
        });
    });
}

function API_DeletePost(id) {
    return new Promise(resolve => {
        $.ajax({
            url: API_URL + "/" + id,
            type: "DELETE",
            statusCode: {
                // Traiter ces codes comme des succès
                200: function() { currentHttpError = ""; resolve(true); },
                202: function() { currentHttpError = ""; resolve(true); },
                204: function() { currentHttpError = ""; resolve(true); },
                102: function() { currentHttpError = ""; resolve(true); }
            },
            success: (data, textStatus, xhr) => { 
                currentHttpError = ""; 
                // Le serveur peut retourner 202 (Accepted), 200 (OK), 204 (No Content), ou 102 (Processing) pour une suppression réussie
                if (xhr.status === 202 || xhr.status === 200 || xhr.status === 204 || xhr.status === 102) {
                    resolve(true);
                } else {
                    currentHttpError = "Réponse inattendue du serveur (Status: " + xhr.status + ")";
                    resolve(false);
                }
            },
            error: (xhr) => {
                // Vérifier si c'est un code de succès qui a été traité comme erreur
                if (xhr.status === 202 || xhr.status === 200 || xhr.status === 204 || xhr.status === 102) {
                    currentHttpError = "";
                    resolve(true);
                    return;
                }
                
                console.error('Erreur API DELETE:', xhr);
                console.error('Status:', xhr.status);
                console.error('Response:', xhr.responseText);
                if (xhr.responseJSON) {
                    currentHttpError = xhr.responseJSON.error_description || 
                                     xhr.responseJSON.message || 
                                     JSON.stringify(xhr.responseJSON);
                } else if (xhr.responseText) {
                    currentHttpError = xhr.responseText;
                } else {
                    currentHttpError = "Erreur lors de la suppression (Status: " + xhr.status + ")";
                }
                resolve(false); 
            }
        });
    });
}

