/////////////////////////////////////////////////////////////////////
// This module is the starting point of the http server
/////////////////////////////////////////////////////////////////////
import APIServer from "./api-server.js";

import RouteRegister from './router.js';
RouteRegister.add('GET', 'Bookmarks', 'list');

let server = new APIServer();
server.start();