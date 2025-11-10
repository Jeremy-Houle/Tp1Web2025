/////////////////////////////////////////////////////////////////////
// Abstrack class Controller 
/////////////////////////////////////////////////////////////////////
// This abstrack class instanciated by a router provides the
// appropriate response to an API request
// A derived class must respect the folowing naming convention
// ModelNamesController
/////////////////////////////////////////////////////////////////////
// Author : Nicolas Chourot
// Lionel-Groulx College
// 2025
/////////////////////////////////////////////////////////////////////
export default class Controller {
    constructor(HttpContext, repository = null) {
        // Prevent Controller class to be instanciated directly
        if (new.target === Controller) {
            throw new Error("Cannot instantiate abstract class Controller directly.");
        }
        this.HttpContext = HttpContext;
        this.repository = repository;
    }
    head() {
        if (this.repository != null) {
            this.HttpContext.response.ETag(this.repository.ETag);
        } else
            this.HttpContext.response.notImplemented();
    }
    get(id) {
        if (this.repository != null) {
            if (id !== '') {
                let data = this.repository.get(id);
                if (data != null)
                    this.HttpContext.response.JSON(data);
                else
                    this.HttpContext.response.notFound("Resource not found.");
            } else {
                let data = this.repository.getAll(this.HttpContext.path.params);
                if (this.repository.valid())
                    this.HttpContext.response.JSON(data, this.repository.ETag, false);
                else
                    this.HttpContext.response.badRequest(this.repository.errorMessages);
            }
        } else
            this.HttpContext.response.notImplemented();
    }
    post(data) {
        data = this.repository.add(data);
        if (this.repository.model.state.isValid) {
            this.HttpContext.response.created(data);
        } else {
            if (this.repository.model.state.inConflict)
                this.HttpContext.response.conflict(this.repository.model.state.errors);
            else
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
        }
    }
    put(data) {
        if (this.HttpContext.path.id !== '') {
            data = this.repository.update(this.HttpContext.path.id, data);
            if (this.repository.model.state.isValid) {
                this.HttpContext.response.accepted(data);
            } else {
                if (this.repository.model.state.notFound) {
                    this.HttpContext.response.notFound(this.repository.model.state.errors);
                } else {
                    if (this.repository.model.state.inConflict)
                        this.HttpContext.response.conflict(this.repository.model.state.errors)
                    else
                        this.HttpContext.response.badRequest(this.repository.model.state.errors);
                }
            }
        } else {
            let modelName = this.repository.model.getClassName();
            this.HttpContext.response.badRequest(`The Id of ${modelName} is not specified in the request url.`);
        }
    }
    remove(id) {
        if (this.HttpContext.path.id !== '') {
            if (this.repository.remove(id))
                this.HttpContext.response.accepted();
            else
                this.HttpContext.response.notFound("Resource not found.");
        } else {
            let modelName = this.repository.model.getClassName();
            this.HttpContext.response.badRequest(`The Id of ${modelName} is not specified in the request url.`);
        }
    }
}
