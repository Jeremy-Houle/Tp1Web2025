import PostModel from '../models/post.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';
import RepositoryCachesManager from '../models/repositoryCachesManager.js';

export default class PostsController extends Controller {
    constructor(HttpContext) {
        super(HttpContext, new Repository(new PostModel()));
    }
    
    put(data) {
        if (this.HttpContext.path.id !== '') {
            RepositoryCachesManager.clear(this.repository.objectsName);
            this.repository.objectsList = null;
            this.repository.read();
        }
        super.put(data);
    }
}

