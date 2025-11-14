const API_URL = "http://localhost:5000/api/Posts";
let currentHttpError = "";
let currentETag = "";

function API_getcurrentHttpError() {
    return currentHttpError;
}

function API_getCurrentETag() {
    return currentETag;
}

function API_GetPosts(limit = null, offset = null, category = null) {
    return new Promise(resolve => {
        let url = API_URL;
        let params = [];
        
        if (category && category !== 'TOUT') {
            params.push(`Category=${encodeURIComponent(category)}`);
        }
        
        if (limit !== null && offset !== null) {
            params.push(`limit=${limit}`);
            params.push(`offset=${offset}`);
        }
        
        params.push('sort=-Creation');
        
        if (params.length > 0) {
            url += '?' + params.join('&');
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
                const etag = xhr.getResponseHeader('ETag');
                if (etag) {
                    currentETag = etag;
                }
                resolve(posts); 
            },
            error: (xhr) => { 
                currentHttpError = xhr.responseJSON?.error_description || "Erreur lors du chargement des posts";
                resolve(null); 
            }
        });
    });
}

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
                }
                resolve(etag);
            },
            error: (xhr) => {
                resolve(null);
            }
        });
    });
}

function API_GetPost(postId) {
    return new Promise(resolve => {
        const formattedId = String(postId).trim();
        const url = API_URL + "/" + encodeURIComponent(formattedId);
        
        $.ajax({
            url: url,
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
        if (!create) {
            if (!post.Id || post.Id === '' || post.Id === 'undefined') {
                currentHttpError = "Erreur: ID du post invalide pour la modification";
                resolve(null);
                return;
            }
        }
        
        let url = create ? API_URL : API_URL + "/" + encodeURIComponent(String(post.Id).trim());
        
        const postData = { ...post };
        if (!create && postData.Id) {
            postData.Id = String(postData.Id).trim();
        }
        
        $.ajax({
            url: url,
            type: create ? "POST" : "PUT",
            contentType: 'application/json',
            data: JSON.stringify(postData),
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            },
            success: (data) => { 
                currentHttpError = ""; 
                resolve(data); 
            },
            error: (xhr) => {
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
                200: function() { currentHttpError = ""; resolve(true); },
                202: function() { currentHttpError = ""; resolve(true); },
                204: function() { currentHttpError = ""; resolve(true); },
                102: function() { currentHttpError = ""; resolve(true); }
            },
            success: (data, textStatus, xhr) => { 
                currentHttpError = ""; 
                if (xhr.status === 202 || xhr.status === 200 || xhr.status === 204 || xhr.status === 102) {
                    resolve(true);
                } else {
                    currentHttpError = "Réponse inattendue du serveur (Status: " + xhr.status + ")";
                    resolve(false);
                }
            },
            error: (xhr) => {
                if (xhr.status === 202 || xhr.status === 200 || xhr.status === 204 || xhr.status === 102) {
                    currentHttpError = "";
                    resolve(true);
                    return;
                }
                
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

