const API_URL = "http://localhost:5000/api/Posts";
let currentHttpError = "";

function API_getcurrentHttpError() {
    return currentHttpError;
}

function API_GetPosts() {
    return new Promise(resolve => {
        $.ajax({
            url: API_URL,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            success: posts => { 
                currentHttpError = ""; 
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

function API_GetPost(postId) {
    return new Promise(resolve => {
        $.ajax({
            url: API_URL + "/" + postId,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            success: post => { 
                currentHttpError = ""; 
                resolve(post); 
            },
            error: (xhr) => { 
                console.error('API_GetPost - Erreur:', xhr);
                console.error('API_GetPost - Status:', xhr.status);
                console.error('API_GetPost - PostId demandé:', postId);
                currentHttpError = xhr.responseJSON?.error_description || "Erreur lors du chargement du post";
                resolve(null); 
            }
        });
    });
}

function API_SavePost(post, create) {
    return new Promise(resolve => {
        const url = create ? API_URL : API_URL + "/" + post.Id;
        console.log('API_SavePost - URL:', url);
        console.log('API_SavePost - Method:', create ? 'POST' : 'PUT');
        console.log('API_SavePost - Post ID:', post.Id);
        console.log('API_SavePost - Create:', create);
        
        $.ajax({
            url: url,
            type: create ? "POST" : "PUT",
            contentType: 'application/json',
            data: JSON.stringify(post),
            success: (data) => { 
                currentHttpError = ""; 
                resolve(data); 
            },
            error: (xhr) => {
                console.error('Erreur API:', xhr);
                console.error('Status:', xhr.status);
                console.error('Response:', xhr.responseText);
                console.error('URL appelée:', url);
                if (xhr.responseJSON) {
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

